extends SceneTree
var game: Node3D
var failures := 0
func _initialize() -> void:
	call_deferred("run")
func check(ok: bool, message: String) -> void:
	print(("PASS " if ok else "FAIL ")+message)
	if not ok:
		failures += 1
func frames(n: int) -> void:
	for i in range(n):
		await physics_frame
func walk(key: int, n: int) -> void:
	game.keys[key] = true
	await frames(n)
	game.keys.clear()
func run() -> void:
	game = load("res://blackwhite.tscn").instantiate()
	root.add_child(game)
	await frames(5)
	check(game.mode=="title","title")
	game.mode = "play"
	game.overlay.hide()
	game.player.position = Vector3(-11,0,3)
	game.toggle_world()
	check(not game.blackwall,"cannot jack in away from terminal")
	game.player.position = game.JACK
	game.interact()
	await frames(5)
	check(game.blackwall and game.net.visible,"terminal enters independent net")
	await walk(KEY_D,110)
	game.interact()
	check(game.stage==1,"walk to and activate node one")
	await frames(95)
	check(absf(game.bridge_a.position.y+0.5)<0.02,"bridge one raised")
	await walk(KEY_D,187)
	check(game.player.position.x>102 and game.player.position.y>-0.2,"walk across first bridge with collision")
	await walk(KEY_W,108)
	game.interact()
	check(game.stage==2,"walk to and activate node two")
	await frames(95)
	check(game.trace>50 and game.sentinel.visible,"trace begins after teaching section")
	var before_pause: float = game.trace
	game.mode = "pause"
	await frames(10)
	check(game.trace==before_pause,"pause freezes trace")
	game.mode = "play"
	game.toggle_world()
	check(game.blackwall,"cannot freely escape net danger")
	# Drop recovery retains puzzle progress and the last stable platform.
	game.player.position.y = -5
	await frames(2)
	check(game.player.position.y>0 and game.stage==2,"fall recovery retains progress")
	await walk(KEY_W,29)
	await walk(KEY_D,147)
	check(game.player.position.x>109 and game.player.position.y>-0.2,"walk across second bridge")
	if DisplayServer.get_name()!="headless":
		await process_frame
		await process_frame
		root.get_texture().get_image().save_png("res://preview-net-new.png")
	game.interact()
	check(not game.blackwall and game.powered,"core returns body and opens city gate")
	check(game.player.position.distance_to(game.JACK)<0.5,"body returns to terminal")
	game.player.position = game.EXIT_POS
	game.interact()
	check(game.mode=="won","escape finishes demo")
	game.mode = "play"
	game.powered = false
	game.stage = 2
	game.player.position = game.JACK
	game.toggle_world()
	game.trace = 0.02
	await frames(4)
	check(game.mode=="caught","trace timeout loses")
	print("BLACKWHITE_TESTS failures=",failures)
	game.queue_free()
	await frames(5)
	quit(1 if failures else 0)
