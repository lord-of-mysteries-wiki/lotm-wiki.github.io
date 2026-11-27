"""Trace a reference map using geometry-only masks and shared topology.
Usage: python3 tools/trace-reference-map.py reference.jpg layout.json output.json
Requires ffmpeg; does not run during Hexo builds. Review output against references.
"""
import json, sys, subprocess, importlib.util, math, random
from collections import deque
from pathlib import Path
spec=importlib.util.spec_from_file_location('trace',Path(__file__).with_name('trace-map-frame.py'))
trace=importlib.util.module_from_spec(spec);spec.loader.exec_module(trace)
layout=json.load(open(sys.argv[2]));width,height=layout['rasterSize']
raw=subprocess.check_output(['ffmpeg','-v','error','-i',sys.argv[1],'-vf',f'scale={width}:{height}','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
def land(box):
 x0,y0,x1,y1=box
 seed=set()
 for y in range(y0,y1):
  for x in range(x0,x1):
   r,g,b=raw[(y*width+x)*3:(y*width+x)*3+3]
   is_land=(r>65) if layout.get('rasterStyle')=='generated-slate' else (r>85 and r>=g-12 and r>=b-12)
   if is_land:seed.add((x,y))
 # Remove single-pixel grid/equator lines before connected-component tracing.
 core={p for p in seed if all((p[0]+dx,p[1]+dy) in seed for dx,dy in [(-1,0),(1,0),(0,-1),(0,1)])}
 seed={q for x,y in core for q in [(x,y),(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if q in seed}
 # Labels and isolated ocean lettering are not land masses.
 seed=set().union(*(c for c in trace.components(seed) if len(c)>=35))
 water=set();queue=deque()
 for x in range(x0,x1):
  for y in [y0,y1-1]:
   if (x,y) not in seed:water.add((x,y));queue.append((x,y))
 for y in range(y0,y1):
  for x in [x0,x1-1]:
   if (x,y) not in seed:water.add((x,y));queue.append((x,y))
 while queue:
  x,y=queue.popleft()
  for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if x0<=p[0]<x1 and y0<=p[1]<y1 and p not in seed and p not in water:water.add(p);queue.append(p)
 result={(x,y) for y in range(y0,y1) for x in range(x0,x1) if (x,y) not in water}
 return set().union(*(c for c in trace.components(result) if len(c)>=55))
def inside(p,poly):
 x,y=p;hit=False
 for a,b in zip(poly,poly[1:]+poly[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit
continents={name:land(box) for name,box in layout['boxes'].items()}
# Authored, geometry-only deformations of the reference coast. Inverse sampling
# preserves its small coves without creating pixel holes when a region stretches.
for edit in layout.get('landDeformations',[]):
 name=edit['continent'];x0,y0,x1,y1=edit['bounds'];rows=edit['rows']
 if name not in continents or len(rows)<2 or any(len(r)!=4 or r[3]<=0 for r in rows):
  raise ValueError('Invalid coast deformation')
 if any(a[0]>=b[0] or a[1]>=b[1] for a,b in zip(rows,rows[1:])):
  raise ValueError('Coast deformation rows must be monotone')
 original=continents[name];center=(x0+x1)/2
 changed={p for p in original if not (x0<=p[0]<x1 and y0<=p[1]<y1)}
 for y in range(max(0,math.ceil(rows[0][1])),min(height,math.ceil(rows[-1][1]))):
  a,b=next((a,b) for a,b in zip(rows,rows[1:]) if a[1]<=y<b[1])
  t=(y-a[1])/(b[1]-a[1]);sy=a[0]+(b[0]-a[0])*t
  shift=a[2]+(b[2]-a[2])*t;scale=a[3]+(b[3]-a[3])*t
  for x in range(max(0,math.floor(center+(x0-center)*scale+shift)),min(width,math.ceil(center+(x1-center)*scale+shift))):
   sx=center+(x-center-shift)/scale
   if (round(sx),round(sy)) in original and x0<=sx<x1 and y0<=sy<y1:changed.add((x,y))
 for polygon in edit.get('cuts',[]):
  changed={p for p in changed if not inside(p,polygon)}
 continents[name]=set().union(*(c for c in trace.components(changed) if len(c)>=55))
labels={}
for p in continents['north']:
 labels[p]=next((name for name,polys in layout['regions'].items() if any(inside(p,poly) for poly in polys)),'north-unmapped')
# Additional continental masks use the same shared-topology builder as the north.
for continent,partition in layout.get('continentRegions',{}).items():
 fallback=next((name for name,polys in partition.items() if not polys),continent+'-unmapped')
 for p in continents[continent]:
  labels[p]=next((name for name,polys in partition.items() if any(inside(p,poly) for poly in polys)),fallback)
# Successor territory inherits the actual predecessor partition, including its
# seal/priority clipping. Store references, never a second copy of those borders.
for inheritance in layout.get('territoryInheritance',[]):
 continent=inheritance['continent'];target=inheritance['target']
 partition=layout['historicalLayouts'][inheritance['variant']]['partitions'][continent]
 inherited=set(inheritance['shapes'])
 if not inherited or not inherited.issubset(partition) or target not in layout['continentRegions'][continent]:
  raise ValueError('Invalid territory inheritance: '+str(inheritance))
 for p in continents[continent]:
  owner=next((name for name,polys in partition.items() if any(inside(p,poly) for poly in polys)),None)
  if owner in inherited:labels[p]=target
arcs,shapes=trace.topology(continents,labels,1.7)
coast_arcs={abs(ref) for name in continents for ring in shapes[name]['rings'] for ref in ring}
def border_detail(points):
 # Cartographic detail only: retain the authored route and every shared junction.
 # Subdivide once on the shared arc, never independently on adjacent countries.
 rng=random.Random(json.dumps(points))
 def split(a,b):
  dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
  if length<2.8:return [a]
  t=rng.uniform(.38,.62)
  offset=rng.uniform(-1,1)*min(1.35,length*.17)
  mid=[a[0]+dx*t-dy/length*offset,a[1]+dy*t+dx/length*offset]
  return split(a,mid)+split(mid,b)
 return [[round(x,3),round(y,3)] for x,y in sum((split(a,b) for a,b in zip(points,points[1:])),[])]+[points[-1]]
for i,arc in enumerate(arcs,1):
 if i not in coast_arcs:
  arc.update(points=border_detail(arc['points']),smoothing='light',curveTension=.45)
for name,shape in shapes.items():
 shape['label']=layout['shapeLabels'].get(name,[0,0])
 shape['labelScale']=layout.get('shapeLabelScales',{}).get(name,1)
data={'version':2,'viewBox':layout['viewBox'],'curveTension':1,'coasts':list(continents),'arcs':arcs,'shapes':shapes,
 'barrierShapes':layout.get('barrierShapes',{}),'landformPaths':layout.get('landformPaths',{}),'focus':layout['points'][layout['focusPoint']] if layout.get('focusPoint') else layout.get('focus'),'labels':layout['labels'],'points':layout['points'],'pointLabels':layout['pointLabels'],'provenance':layout['provenance']}
# Each historical layout receives its own topology, but uses the same border finish.
variants={}
for key,period in layout.get('historicalLayouts',{}).items():
 period_arcs=[];period_shapes={};period_coasts=[]
 for continent,landmask in continents.items():
  partition=period['partitions'].get(continent)
  if partition:
   fallback=next((name for name,polys in partition.items() if not polys),continent)
   cells={p:next((name for name,polys in partition.items() if any(inside(p,poly) for poly in polys)),fallback) for p in landmask}
  else:cells={p:continent for p in landmask}
  for override in period.get('overrides',{}).get(continent,[]):
   for p in landmask:
    if inside(p,override['polygon']):cells[p]=override['shape']
  # Later layouts reuse the inherited land ownership instead of claiming the
  # Abyss through an unbounded eastern-land fallback.
  for inheritance in layout.get('territoryInheritance',[]):
   if inheritance['continent']==continent and key!=inheritance['variant']:
    target=inheritance['target']
    for p in landmask:
     if cells[p]==target and labels.get(p)!=target:cells[p]=target+'-unassigned'
  local_arcs,local_shapes=trace.topology({'north':landmask},cells,1.7)
  local_coast={abs(ref) for ring in local_shapes['north']['rings'] for ref in ring}
  for i,arc in enumerate(local_arcs,1):
   if i not in local_coast:arc.update(points=border_detail(arc['points']),smoothing='light',curveTension=.45)
  offset=len(period_arcs)
  coast=local_shapes.pop('north')
  local_shapes[continent]=coast
  for name,shape in local_shapes.items():
   shape['rings']=[[int(ref/abs(ref))*(abs(ref)+offset) for ref in ring] for ring in shape['rings']]
   shape['label']=period['labels'].get(name,layout['shapeLabels'].get(name,[0,0]))
   shape['labelScale']=layout.get('shapeLabelScales',{}).get(name,1)
   # A maritime power can hold land on more than one continental mask.
   # Keep every island ring in the one shared polity, rather than replacing it.
   if name in period_shapes:
    period_shapes[name]['rings'].extend(shape['rings'])
   else:
    period_shapes[name]=shape
  period_arcs.extend(local_arcs);period_coasts.append(continent)
 variants[key]={'version':2,'viewBox':data['viewBox'],'arcs':period_arcs,'shapes':period_shapes,'coasts':period_coasts}
data['variants']=variants
Path(sys.argv[3]).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'{len(arcs)} shared arcs, {sum(len(a["points"]) for a in arcs)} vertices')
