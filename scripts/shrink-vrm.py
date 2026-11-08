"""Shrink a VRM (glTF binary) for the web: resize/re-encode its textures, keep everything else.
Usage: python shrink-vrm.py in.vrm out.vrm
Sizes are by texture name; images without alpha become JPEG."""
import io, json, struct, sys
from PIL import Image

SIZES = [('Thumbnail', 64), ('Bottoms', 64), ('Shoes', 64), ('_nml', 256), ('Matcap', 128), ('Eye', 256),
         ('FaceMouth', 256), ('FaceBrow', 256), ('FaceEyel', 256), ('Face_00', 1024), ('Hair', 512),
         ('Tops', 1024), ('Body', 512), ('Accessory', 128), ('_spe', 256)]

def target(name):
    for key, size in SIZES:
        if key in (name or ''):
            return size
    return 512

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jlen = struct.unpack('<I', b[12:16])[0]
gltf = json.loads(b[20:20 + jlen])
binstart = 20 + jlen + 8
blob = b[binstart:]
views = gltf['bufferViews']
chunks = {}
for i, view in enumerate(views):
    off = view.get('byteOffset', 0)
    chunks[i] = blob[off:off + view['byteLength']]

for img in gltf.get('images', []):
    vi = img['bufferView']
    im = Image.open(io.BytesIO(chunks[vi]))
    im.load()
    size = target(img.get('name'))
    if max(im.size) > size:
        im = im.resize((size, size) if im.size[0] == im.size[1] else (size, int(im.size[1] * size / im.size[0])), Image.LANCZOS)
    # Hair and iris go grey so the page can tint them any colour (black hair, dark brown eyes).
    if any(k in (img.get('name') or '') for k in ('Hair_00_0', 'HairBack_00', 'EyeIris')) and '_nml' not in img.get('name', ''):
        rgba = im.convert('RGBA')
        grey = rgba.convert('L')
        im = Image.merge('RGBA', (grey, grey, grey, rgba.getchannel('A')))
    out = io.BytesIO()
    has_alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 255
    if has_alpha or '_nml' in (img.get('name') or ''):
        im.save(out, 'PNG', optimize=True)
        img['mimeType'] = 'image/png'
    else:
        im.convert('RGB').save(out, 'JPEG', quality=86, optimize=True)
        img['mimeType'] = 'image/jpeg'
    chunks[vi] = out.getvalue()

# rebuild the binary buffer, 4-byte aligned
newblob = bytearray()
for i, view in enumerate(views):
    while len(newblob) % 4: newblob.append(0)
    view['byteOffset'] = len(newblob)
    view['byteLength'] = len(chunks[i])
    newblob += chunks[i]
while len(newblob) % 4: newblob.append(0)
gltf['buffers'] = [{'byteLength': len(newblob)}]

js = json.dumps(gltf, separators=(',', ':'), ensure_ascii=False).encode('utf8')
while len(js) % 4: js += b' '
total = 12 + 8 + len(js) + 8 + len(newblob)
with open(dst, 'wb') as f:
    f.write(struct.pack('<4sII', b'glTF', 2, total))
    f.write(struct.pack('<I4s', len(js), b'JSON')); f.write(js)
    f.write(struct.pack('<I4s', len(newblob), b'BIN\x00')); f.write(newblob)
print(f'{src} {len(b)//1024} KB -> {dst} {total//1024} KB')
