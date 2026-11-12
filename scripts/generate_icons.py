"""Deterministic PNG icons using only the Python standard library."""
import struct,zlib,math
from pathlib import Path

def png(size):
    rows=[]
    for y in range(size):
        row=bytearray()
        for x in range(size):
            u,v=x/size,y/size
            r,g,b=15,23,42
            def rect(x1,y1,x2,y2,color):
                nonlocal r,g,b
                if x1<=u<=x2 and y1<=v<=y2: r,g,b=color
            rect(.18,.23,.82,.68,(71,85,105))
            rect(.21,.26,.79,.65,(2,6,23))
            rect(.44,.68,.56,.79,(71,85,105))
            rect(.35,.78,.65,.81,(100,116,139))
            # Terminal chevron and cursor, rendered as distance fields.
            for x1,y1,x2,y2,color in [(.29,.36,.40,.46,(96,165,250)),(.40,.46,.29,.56,(96,165,250)),(.46,.56,.61,.56,(52,211,153))]:
                dx,dy=x2-x1,y2-y1
                t=max(0,min(1,((u-x1)*dx+(v-y1)*dy)/(dx*dx+dy*dy)))
                if math.hypot(u-x1-t*dx,v-y1-t*dy)<.016: r,g,b=color
            row.extend((r,g,b,255))
        rows.append(b'\x00'+row)
    def chunk(kind,data): return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
for n in [192,512]: Path(f'public/icon-{n}.png').write_bytes(png(n))
