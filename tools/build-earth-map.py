"""Convert Natural Earth 1:110m land GeoJSON to the shared map schema.
Usage: python3 tools/build-earth-map.py input.geojson output.json
Lambert cylindrical equal-area, standard parallels ±30 degrees; no coast smoothing.
"""
import json, math, sys
source=json.load(open(sys.argv[1]))
width=1240
cos30=math.cos(math.pi/6)
scale=width/(2*math.pi*cos30)
height=2*scale/cos30
arcs=[]
for feature in source['features']:
    geom=feature['geometry']
    polygons=[geom['coordinates']] if geom['type']=='Polygon' else geom['coordinates']
    for polygon in polygons:
        for ring in polygon:
            points=[[round(width/2+math.radians(lon)*cos30*scale,3),round(height/2-math.sin(math.radians(lat))*scale/cos30,3)] for lon,lat,*_ in ring]
            if points[0]!=points[-1]:points.append(points[0])
            arcs.append({'points':points})
data={'focus':[round(width/2+math.radians(105)*cos30*scale,3),round(height/2-math.sin(math.radians(35))*scale/cos30,3)],'version':2,'viewBox':[0,0,width,round(height,3)],'curveTension':0,'smoothing':'none','coasts':['earth'],'arcs':arcs,
      'shapes':{'earth':{'rings':[[i+1] for i in range(len(arcs))],'label':[620,height/2]}},'labels':[],
      'provenance':{'source':'Natural Earth ne_110m_land','url':'https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/',
                    'license':'Public domain','projection':'Lambert cylindrical equal-area, standard parallels ±30°',
                    'scope':'现代海岸线作为史前旧文明地球参照；不是古地理复原，不绘现代国界。'}}
with open(sys.argv[2],'w') as out:json.dump(data,out,ensure_ascii=False,separators=(',',':'));out.write('\n')
