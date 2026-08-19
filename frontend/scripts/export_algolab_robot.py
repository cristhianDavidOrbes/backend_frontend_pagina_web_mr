"""Exporta el robot low-poly de Unity a un GLB ligero para la web.

El FBX contiene texturas pintadas para la cara, el pecho y las extremidades.
Se conservan esos materiales originales: reemplazarlos por colores planos
elimina precisamente los detalles que identifican al robot de AlgoLab.
"""

from pathlib import Path
import sys

import bpy


SOURCE = Path(
    r"C:\UnityProjects\algolab\Assets\__Algolab\Resources\Level3\RobotWorkshop\Models\Robot\AlgoLabRobot.fbx"
)
DEFAULT_OUTPUT = Path(
    r"C:\UnityProjects\algolab\ModulosExternos\proyecto-mr-web\frontend\public\models\algolab-robot.glb"
)
OUTPUT = Path(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else DEFAULT_OUTPUT


for item in list(bpy.data.objects):
    bpy.data.objects.remove(item, do_unlink=True)

bpy.ops.import_scene.fbx(filepath=str(SOURCE))

# La landing usa un robot estático. Quitar el Armature sin hornear antes su
# deformación deja modificadores apuntando a un objeto eliminado; al exportar,
# glTF vuelve a aplicar matrices de skin y aparecen triángulos atravesando la
# cabeza y el pecho. Se genera una copia evaluada de cada malla mientras el
# esqueleto todavía existe y después se descarta todo el rig.
bpy.context.scene.frame_set(0)
for armature in bpy.data.armatures:
    armature.pose_position = "REST"

bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
robot_parts = []

for source_object in list(bpy.context.scene.objects):
    if source_object.type != "MESH" or source_object.name == "Cube":
        continue

    evaluated = source_object.evaluated_get(depsgraph)
    baked_mesh = bpy.data.meshes.new_from_object(
        evaluated,
        preserve_all_data_layers=True,
        depsgraph=depsgraph,
    )
    baked_mesh.name = source_object.data.name + "_Web"

    baked_object = bpy.data.objects.new(source_object.name, baked_mesh)
    baked_object.matrix_world = source_object.matrix_world.copy()
    bpy.context.collection.objects.link(baked_object)
    robot_parts.append(baked_object)

for item in list(bpy.context.scene.objects):
    if item not in robot_parts:
        bpy.data.objects.remove(item, do_unlink=True)

for value in bpy.data.materials:
    if not value.use_nodes or not value.node_tree:
        continue
    shader = value.node_tree.nodes.get("Principled BSDF")
    if not shader:
        continue
    # El FBX enlaza una segunda copia de cada textura al canal Alpha. Blender
    # muestra el material como opaco por su modo de superficie, pero glTF toma
    # ese enlace literalmente y genera ``alphaMode: BLEND``. En Three.js esto
    # produce sorting entre miles de triangulos y parece que cabeza y pecho
    # estuvieran deformados o sin textura. El arte original no usa recortes ni
    # transparencia, por lo que la representacion correcta en web es OPAQUE.
    alpha_input = shader.inputs.get("Alpha")
    if alpha_input:
        for link in list(alpha_input.links):
            value.node_tree.links.remove(link)
        alpha_input.default_value = 1.0

    # Conserva una sola textura: la que realmente alimenta Base Color. Las
    # copias creadas por el importador FBX ya no son necesarias y confunden al
    # exportador de glTF al elegir el sampler.
    base_color = shader.inputs.get("Base Color")
    base_texture_nodes = {
        link.from_node for link in (base_color.links if base_color else [])
        if link.from_node.type == "TEX_IMAGE"
    }
    for node in list(value.node_tree.nodes):
        if node.type == "TEX_IMAGE" and node not in base_texture_nodes:
            value.node_tree.nodes.remove(node)

    # Mantiene la textura Base Color y solo adapta la respuesta a las luces web.
    shader.inputs["Metallic"].default_value = 0.08
    shader.inputs["Roughness"].default_value = 0.42
    # Las cinco texturas empacadas son completamente opacas. El FBX las marcaba
    # como Alpha Hashed y el exportador las convertia a alphaMode=BLEND; eso
    # desordenaba la profundidad y hacia desaparecer fragmentos de cabeza y
    # pecho en WebGL. Se exportan como superficies opacas y de una sola cara.
    value.blend_method = "OPAQUE"
    value.use_backface_culling = True

bpy.ops.object.select_all(action="DESELECT")
for item in robot_parts:
    item.select_set(True)

# El modelo se centra en el origen para que Drei/Center pueda encuadrarlo igual
# en escritorio y movil. La escala visual final se controla en React Three Fiber.
bpy.context.scene.world.color = (0.005, 0.009, 0.011)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(OUTPUT),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_materials="EXPORT",
    export_image_format="AUTO",
    export_texcoords=True,
    export_normals=True,
    export_yup=True,
)

print(f"Exportado: {OUTPUT}")
