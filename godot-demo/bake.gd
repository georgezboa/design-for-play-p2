extends SceneTree
## Run once with --headless --script res://bake.gd to regenerate editable architecture.
func _initialize() -> void:
	var world := Node3D.new()
	world.name = "QuietWard"
	world.set_script(load("res://ward.gd"))
	world.build_room()
	assign_owner(world,world)
	var packed := PackedScene.new()
	packed.pack(world)
	ResourceSaver.save(packed,"res://ward.tscn")
	world.free()
	print("BAKE_OK: editable architecture saved")
	quit()

func assign_owner(node: Node, root: Node) -> void:
	for child in node.get_children():
		child.owner = root
		assign_owner(child,root)
