extends SceneTree
var ward: Node3D

func _initialize() -> void:
	call_deferred("run_tests")

func check(ok: bool, message: String) -> void:
	if not ok:
		push_error("FAIL: " + message)
		quit(1)
		return
	print("PASS: " + message)

func frames(count: int) -> void:
	for i in range(count):
		await physics_frame

func run_tests() -> void:
	ward = load("res://ward.tscn").instantiate()
	root.add_child(ward)
	await frames(3)
	check(ward.mode == "title","title screen")
	ward.mode = "play"
	ward.overlay.hide()
	var original_pos: Vector3 = ward.player.position
	ward.toggle_world()
	check(ward.blackwall and ward.get_node("Architecture/BlackwallEchoes").visible,"blackwall layer enabled")
	check(ward.player.position == original_pos,"world switch preserves player position")
	ward.toggle_world()
	check(not ward.blackwall and ward.get_node("Architecture/Rain").visible,"return restores rain city")
	ward.player.velocity.y = 4.7
	await frames(8)
	check(ward.player.position.y > 0.2,"jump rises above floor")
	await frames(45)
	check(ward.player.is_on_floor(),"jump lands")
	ward.keys[KEY_D] = true
	await frames(30)
	ward.keys.clear()
	check(ward.player.position.x > -9.2,"walking changes position")
	ward.player.position = Vector3(-3,0.05,0)
	ward.keys[KEY_C] = true
	await frames(4)
	check(ward.hidden,"crouch under table conceals player")
	ward.keys.clear()
	await frames(3)
	check(ward.crouched,"cannot stand through tabletop")
	ward.player.position = Vector3(-7,0,-2.5)
	ward.nurse.position = Vector3(-3.5,0,-2.5)
	ward.nurse_figure.rotation.y = -PI/2
	ward.patrol_target = Vector3(-9,0,-2.5)
	await frames(38)
	check(ward.suspicion > 0.1,"visible player accumulates suspicion")
	ward.player.position = Vector3(-3,0.05,0)
	ward.keys[KEY_C] = true
	ward.search_time = 0.05
	await frames(100)
	check(ward.hidden and ward.suspicion < 0.1,"hiding breaks detection")
	ward.keys.clear()
	ward.nurse.position = Vector3(-7,0,-2.5)
	ward.nurse_state = "patrol"
	ward.player.position = Vector3(3.7,0.05,-3.7)
	await frames(2)
	ward.interact()
	check(ward.has_fuse and not ward.fuse.visible,"power cell collected")
	ward.player.position = Vector3(8.1,0.05,1.8)
	await frames(2)
	ward.interact()
	check(ward.powered and ward.door.position.y>5,"console opens lift")
	check(ward.nurse_state == "chase","power noise alerts caretaker")
	ward.player.position = Vector3(11.3,0.05,1.8)
	ward.interact()
	check(ward.mode == "won","lift interaction completes demo")
	ward.mode = "play"
	ward.player.position = ward.nurse.position + Vector3(0.1,0,0)
	await frames(3)
	check(ward.mode == "caught","caretaker capture")
	ward.mode = "play"
	ward.powered = false
	ward.has_fuse = false
	ward.fuse.show()
	ward.hidden = false
	ward.player.position = Vector3(-10,0,2.8)
	ward.nurse.position = Vector3(1,0,-2.5)
	ward.nurse_state = "patrol"
	ward.overlay.hide()
	await frames(10)
	if DisplayServer.get_name() != "headless":
		await process_frame
		await process_frame
		root.get_texture().get_image().save_png("res://preview.png")
		ward.toggle_world()
		await frames(50)
		await process_frame
		root.get_texture().get_image().save_png("res://preview-blackwall.png")
	print("ALL_TESTS_PASSED")
	ward.queue_free()
	await process_frame
	quit()
