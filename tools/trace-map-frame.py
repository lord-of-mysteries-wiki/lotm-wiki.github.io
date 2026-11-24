"""Trace the supplied video frames into a shared-arc map, never separate country strokes.

The source is a fan-made schematic. Geometry does not establish historical borders.
Requires ffmpeg; all segmentation/topology operations use the Python standard library.
"""
import argparse
import collections
import json
import math
import pathlib
import subprocess

W, H = 1280, 720


def rgb(file):
    return subprocess.check_output(['ffmpeg', '-v', 'error', '-i', file, '-vf',
        'scale=1280:720', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-frames:v', '1', 'pipe:1'])


def components(pixels):
    pending = set(pixels)
    while pending:
        seed = min(pending)
        pending.remove(seed)
        group, queue = {seed}, [seed]
        for x, y in queue:
            for p in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if p in pending:
                    pending.remove(p)
                    group.add(p)
                    queue.append(p)
        yield group


def filled_land(raw, box):
    x0, y0, x1, y1 = box
    land = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            r,g,b = raw[(y*W+x)*3:(y*W+x)*3+3]
            if r > 80 and r > g*1.7 and r > b*1.5:
                land.add((x,y))
    # Flood the exterior. Interior label holes are not lakes.
    water = set()
    queue = [(x,y0) for x in range(x0,x1)] + [(x,y1-1) for x in range(x0,x1)]
    queue += [(x0,y) for y in range(y0,y1)] + [(x1-1,y) for y in range(y0,y1)]
    for p in queue:
        if p not in land:
            water.add(p)
    queue = list(water)
    for x,y in queue:
        for p in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if x0 <= p[0] < x1 and y0 <= p[1] < y1 and p not in land and p not in water:
                water.add(p)
                queue.append(p)
    land = {(x,y) for y in range(y0,y1) for x in range(x0,x1) if (x,y) not in water}
    return set().union(*(c for c in components(land) if len(c) >= 24))


def partition(land, raw):
    # Sampled colors of the supplied frame. These are recognition colors, not UI colors.
    palette = [('north-north',(169,203,117)), ('north-west',(203,170,118)),
        ('north-east',(82,120,244)), ('north-south',(169,103,118)),
        ('north-unmapped',(103,169,83)), ('north-unmapped',(122,83,101))]
    labels = {}
    for x,y in sorted(land):
        color = raw[(y*W+x)*3:(y*W+x)*3+3]
        distances = [sum((a-b)**2 for a,b in zip(color,rgb)) for _,rgb in palette]
        best = min(range(len(distances)), key=distances.__getitem__)
        if distances[best] < 26**2:
            labels[x,y] = palette[best][0]
    # Discard tiny recognition specks before growing across label/edge pixels.
    clean = {}
    for label in sorted(set(labels.values())):
        for group in components({p for p,v in labels.items() if v == label}):
            if len(group) >= 40:
                clean.update((p,label) for p in group)
    labels = clean
    # A single categorical raster fills text and anti-aliased edges; countries cannot overlap.
    queue = list(labels)
    for p in queue:
        x,y = p
        for q in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if q in land and q not in labels:
                labels[q] = labels[p]
                queue.append(q)
    for p in land:
        labels.setdefault(p, 'north-unmapped')
    # Remove isolated color noise, keeping meaningful small islands and thin land bridges.
    for _ in range(2):
        updates = {}
        for x,y in land:
            neighbors = [labels[p] for p in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)) if p in land]
            if neighbors:
                label,n = collections.Counter(neighbors).most_common(1)[0]
                if n >= 3:
                    updates[x,y] = label
        labels.update(updates)
    return labels


def rdp(points, epsilon):
    if len(points) < 3:
        return points
    a,b = points[0],points[-1]
    dx,dy = b[0]-a[0],b[1]-a[1]
    length = math.hypot(dx,dy)
    distances = [abs(dy*(x-a[0])-dx*(y-a[1]))/length if length else math.dist(a,(x,y)) for x,y in points]
    i = max(range(len(points)),key=distances.__getitem__)
    if distances[i] > epsilon:
        return rdp(points[:i+1],epsilon)[:-1] + rdp(points[i:],epsilon)
    return [a,b]


def topology(continents, labels, tolerance):
    # Clockwise directed pixel edges are stored for each face; physical edges have one key.
    directed = collections.defaultdict(list)
    owners = collections.defaultdict(set)
    def add(shape,a,b):
        directed[shape].append((a,b))
        owners[tuple(sorted((a,b)))].add(shape)
    for continent,land in continents.items():
        for x,y in sorted(land):
            own = labels.get((x,y),continent)
            for neighbor,a,b in [((x,y-1),(x,y),(x+1,y)),((x+1,y),(x+1,y),(x+1,y+1)),
                    ((x,y+1),(x+1,y+1),(x,y+1)),((x-1,y),(x,y+1),(x,y))]:
                if neighbor not in land:
                    add(continent,a,b)
                    if own != continent:
                        add(own,a,b)
                elif labels.get(neighbor,continent) != own:
                    add(own,a,b)
    edges = sorted(owners)
    adjacency = collections.defaultdict(list)
    for edge in edges:
        for p in edge:
            adjacency[p].append(edge)
    pair = {e:tuple(sorted(owners[e])) for e in edges}
    def junction(p, group):
        return len(adjacency[p]) != 2 or any(pair[e] != group for e in adjacency[p])
    unused, arcs, lookup = set(edges), [], {}
    while unused:
        first = min(unused)
        group = pair[first]
        start = next((p for p in first if junction(p,group)),first[0])
        # If this edge is inside a chain, walk back to a junction first.
        if not junction(start,group):
            p,prev = start,first
            visited = {first}
            while True:
                candidates = [e for e in adjacency[p] if e != prev and pair[e] == group]
                if not candidates:
                    break
                e = candidates[0]
                if e in visited:
                    break
                visited.add(e)
                p = e[0] if e[1] == p else e[1]
                prev = e
                if junction(p,group):
                    start,first = p,e
                    break
        raw, walk, p, e = [start], [], start, first
        while e in unused:
            unused.remove(e)
            q = e[0] if e[1] == p else e[1]
            walk.append((p,q))
            raw.append(q)
            if q == start or junction(q,group):
                break
            candidates = [candidate for candidate in adjacency[q] if candidate in unused and pair[candidate] == group]
            if not candidates:
                break
            p,e = q,candidates[0]
        if raw[0] == raw[-1]:
            half = len(raw)//2
            points = rdp(raw[:half+1],tolerance)[:-1] + rdp(raw[half:],tolerance)
        else:
            points = rdp(raw,tolerance)
        arc_id = len(arcs)+1
        arcs.append({'points':points})
        for a,b in walk:
            lookup[a,b] = arc_id
            lookup[b,a] = -arc_id
    shapes = {}
    for shape,oriented in directed.items():
        remaining = set(oriented)
        outgoing = collections.defaultdict(list)
        for a,b in oriented:
            outgoing[a].append(b)
        rings = []
        while remaining:
            a,b = min(remaining)
            start,ring = a,[]
            while (a,b) in remaining:
                remaining.remove((a,b))
                ref = lookup[a,b]
                if not ring or ring[-1] != ref:
                    ring.append(ref)
                if b == start:
                    break
                candidates = sorted(q for q in outgoing[b] if (b,q) in remaining)
                if not candidates:
                    raise ValueError(f'Open polygon: {shape} {b}')
                a,b = b,candidates[0]
            if len(ring)>1 and ring[0]==ring[-1]:
                ring.pop()
            rings.append(ring)
        shapes[shape] = {'rings':rings,'label':[0,0]}
    return arcs,shapes


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--coast-frame',required=True)
    parser.add_argument('--regions-frame',required=True)
    parser.add_argument('--output',required=True)
    parser.add_argument('--tolerance',type=float,default=2.2)
    args=parser.parse_args()
    first,current=rgb(args.coast_frame),rgb(args.regions_frame)
    continents={name:filled_land(first,box) for name,box in [
        ('north',(25,60,520,315)),('south',(315,330,550,525)),('east',(580,65,1260,500))]}
    arcs,shapes=topology(continents,partition(continents['north'],current),args.tolerance)
    for name,label in {'north':[285,195],'south':[423,430],'east':[840,250],
            'north-north':[280,137],'north-west':[230,194],'north-east':[365,231],'north-south':[279,269]}.items():
        shapes[name]['label']=label
    data={'version':2,'viewBox':[25,65,1240,470],'curveTension':1,'coasts':['north','south','east'],
        'arcs':arcs,'shapes':shapes,'labels':[
            {'key':'map_east','at':[790,250]},{'key':'map_west','at':[1060,210]},
            {'key':'map_fog','at':[125,375]},{'key':'map_sonia','at':[550,260]},{'key':'map_berserk','at':[380,330]}],
        'provenance':{'reference':'用户提供的《【诡秘之主】历史地图完整版》视频提取帧',
            'url':'https://www.bilibili.com/video/BV1qi4y147rN/',
            'author':'画面署名：无666名；视频简介称底图参考阙憾空城',
            'frames':{'coast':'00:01 第一纪元','regions':'02:52 第五纪元1349年'},
            'method':'单一分区栅格生成共享边界弧；同一边界只简化和平滑一次，区域环以正反方向引用。非官方地图；位置与疆界待核实。'}}
    output=pathlib.Path(args.output)
    if output.exists():
        data['points']=json.loads(output.read_text()).get('points',{})
    pathlib.Path(args.output).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(arcs)} shared arcs; {sum(len(a["points"]) for a in arcs)} vertices; {len(shapes)} faces')

if __name__=='__main__':
    main()
