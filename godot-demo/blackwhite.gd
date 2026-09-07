extends "res://ward.gd"
## Separate playable net architecture; inherited ward remains the legacy city prototype.
const ORIGIN := Vector3(100,0,0)
const JACK := Vector3(-8.5,0,2.8)
const ENTRY := Vector3(-10,0.1,3)
const NODE_A := Vector3(-5,0,3)
const NODE_B := Vector3(3,0,-2)
const CORE := Vector3(10,0,-2)
var net: Node3D
var stage := 0
var trace := 0.0
var shifting := false
var bridge_a: Node3D
var bridge_b: Node3D
var sentinel: Node3D
var anchor := ENTRY
var body_position := JACK
var net_materials: Array = []
var notice := ""
var notice_time := 0.0
var white: StandardMaterial3D
var ink: StandardMaterial3D
var red: StandardMaterial3D

func flat(color: String) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color)
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func slab(at: Vector3, dimensions: Vector3, solid := false, dark := false) -> Node3D:
	return box(net,"DataMass",at,dimensions,ink if dark else white,solid)

func wire(parent: Node3D, at: Vector3, dimensions: Vector3, mat: Material, width := 0.018) -> void:
	for x in [-1,1]:
		for y in [-1,1]:
			box(parent,"Wire",at+Vector3(x*dimensions.x/2,y*dimensions.y/2,0),Vector3(width,width,dimensions.z),mat)
	for x in [-1,1]:
		for z in [-1,1]:
			box(parent,"Wire",at+Vector3(x*dimensions.x/2,0,z*dimensions.z/2),Vector3(width,dimensions.y,width),mat)
	for y in [-1,1]:
		for z in [-1,1]:
			box(parent,"Wire",at+Vector3(0,y*dimensions.y/2,z*dimensions.z/2),Vector3(dimensions.x,width,width),mat)

func platform(at: Vector3, size_: Vector3) -> Node3D:
	var p := slab(at,size_,true,true)
	box(p,"WhiteDeck",Vector3(0,size_.y/2+0.005,0),Vector3(size_.x,0.015,size_.z),white)
	wire(p,Vector3.ZERO,size_,white,0.025)
	# Black transverse markings make depth and walkable surfaces readable.
	for i in range(int(size_.x)):
		box(p,"DeckSeam",Vector3(-size_.x/2+i+0.5,size_.y/2+0.02,0),Vector3(0.026,0.01,size_.z),ink)
	return p

func setup_worlds() -> void:
	get_node("Architecture/BlackwallEchoes").hide()
	fuse.hide()
	world_label = label_(overlay.get_parent(),Vector2(38,675),"REALSPACE / RAIN MARKET",14,Color("82dce5"))
	for bounds in [Rect2(22,16,900,122),Rect2(925,16,330,52),Rect2(22,661,1236,134)]:
		var backing := ColorRect.new()
		backing.position = bounds.position
		backing.size = bounds.size
		backing.color = Color(0.015,0.02,0.028,0.92)
		backing.mouse_filter = Control.MOUSE_FILTER_IGNORE
		overlay.get_parent().add_child(backing)
		overlay.get_parent().move_child(backing,0)
	title.text = "GHOST / PROTOCOL"
	subtitle.text = "NIGHTFALL  /  BLACK & WHITE NET DEMO\n\nFind the cyan terminal in the street. [E] or [Q] to jack in.\nRebuild two broken routes. Retrieve the gate key.\nReturn to the rain market and escape through the transit gate.\n\nENTER / BEGIN"
	white = flat("f4f5f3")
	ink = flat("050609")
	red = flat("ec344c")
	box(self,"AccessTerminal",JACK+Vector3(0,0.7,-0.65),Vector3(0.7,1.4,0.45),material(Color("203344")),true)
	box(self,"AccessDisplay",JACK+Vector3(0,1.1,-0.39),Vector3(0.52,0.34,0.02),material(Color("84e5ed"),0,2))
	sign_(self,"JACK IN / E",JACK+Vector3(0,1.9,-0.6),24,Color("a3eef4"))
	net = Node3D.new()
	net.name = "MonochromeNet"
	add_child(net)
	net.position = ORIGIN
	build_net()
	net.hide()
	# Keep avatar color distinct from the binary environment.
	for mesh in figure.find_children("*","MeshInstance3D",true,false):
		net_materials.append([mesh,mesh.material_override])

func build_net() -> void:
	platform(Vector3(-7.5,-0.5,3),Vector3(7,1,3))
	platform(Vector3(3,-0.5,0.5),Vector3(3,1,8))
	platform(Vector3(10,-0.5,-2),Vector3(3,1,4))
	bridge_a = platform(Vector3(-1.25,-0.5,3),Vector3(5.5,1,2.3))
	bridge_a.position.y = -7
	bridge_b = platform(Vector3(6.5,-0.5,-2),Vector3(4,1,2.3))
	bridge_b.position.y = -7
	for p in [NODE_A,NODE_B,CORE]:
		var n := box(net,"Relay",p+Vector3(0,0.85,0),Vector3(0.42,0.42,0.42),red)
		n.rotation_degrees = Vector3(0,45,45)
		wire(net,p+Vector3(0,0.85,0),Vector3(0.85,0.85,0.85),white)
	sign_(net,"01 / RECONSTRUCT",NODE_A+Vector3(0,1.8,0),22,Color.WHITE)
	sign_(net,"02 / RECONNECT",NODE_B+Vector3(0,1.8,0),22,Color.WHITE)
	sign_(net,"03 / EXTRACT",CORE+Vector3(0,1.8,0),22,Color.WHITE)
	# Layered data canyons: real volumes, binary faces, nested frame structures.
	var rng := RandomNumberGenerator.new()
	rng.seed = 7092026
	for i in range(44):
		var x := rng.randf_range(-24,26)
		var z := rng.randf_range(-23,-9)
		var height := rng.randf_range(5,22)
		var dims := Vector3(rng.randf_range(1.2,4),height,rng.randf_range(1,3))
		var pos := Vector3(x,height/2-4,z)
		var tower := slab(pos,dims,false,i%3==0)
		for j in range(2,int(height*2)):
			var band_width := dims.x*(1.0 if j%4 else 0.55)
			box(tower,"BinaryBands",Vector3((dims.x-band_width)/2,-height/2+j*0.5,dims.z/2+0.02),Vector3(band_width+0.08,0.06 if j%3 else 0.24,0.03),white if i%3==0 else ink)
		for j in range(1,4):
			box(tower,"VerticalChannels",Vector3(-dims.x/2+dims.x*j/4,0,dims.z/2+0.04),Vector3(0.045,height,0.025),ink if i%3==0 else white)
		wire(net,pos+Vector3(0,1,0),dims+Vector3(0.4,2,0.4),white)
	for i in range(13):
		var x := -19.0+i*3.3
		wire(net,Vector3(x,-8,-2),Vector3(2.5,15,8),white,0.012)
		wire(net,Vector3(x,15,-8),Vector3(3,6,16),white,0.012)
		# Suspended orthogonal slabs break the normal city skyline.
		slab(Vector3(x,12+float(i%3),-10),Vector3(2.6,0.4,12),false,i%2==0)
	for y in [-9,-5,6,10]:
		box(net,"EndlessCoordinate",Vector3(0,y,-12),Vector3(65,0.018,0.018),white)
	for x in [-18,-12,0,12,18]:
		box(net,"Crosshair",Vector3(x,4,-8),Vector3(0.014,34,0.014),red)
	box(net,"Crosshair",Vector3(0,4,-8),Vector3(65,0.014,0.014),red)
	sentinel = Node3D.new()
	net.add_child(sentinel)
	sentinel.position = Vector3(-10,5,-8)
	for i in range(5):
		wire(sentinel,Vector3.ZERO,Vector3.ONE*(2.5+i*0.5),red,0.035)
	sentinel.hide()

func tell(message: String) -> void:
	notice = message
	notice_time = 3.5

func toggle_world() -> void:
	if not blackwall:
		if powered:
			tell("KEY ACQUIRED / FIND THE TRANSIT GATE")
			return
		if player.position.distance_to(JACK)>1.8:
			tell("FIND THE CYAN TERMINAL TO JACK IN")
			return
		body_position = player.position
		blackwall = true
		get_node("Architecture").hide()
		nurse.hide()
		door.hide()
		net.show()
		player.position = ORIGIN+anchor
		for entry in net_materials:
			var old: StandardMaterial3D = entry[1]
			entry[0].material_override = flat("182c3c" if old.albedo_color.v<0.4 else "7abccf")
		get_node("Architecture/WorldEnvironment").environment.background_color = Color("050609")
		camera.size = 19
		tell("01 / REBUILD THE BROKEN ROUTE WITH E")
	else:
		# Exit only from the entry anchor or the recovered core; Q is not a free escape.
		var local_pos := player.position-ORIGIN
		if local_pos.distance_to(ENTRY)>1.8 and not (stage==3 and local_pos.distance_to(CORE)<1.8):
			tell("RETURN TO THE ENTRY ANCHOR / OR EXTRACT THE CORE")
			return
		blackwall = false
		net.hide()
		get_node("Architecture").show()
		get_node("Architecture/BlackwallEchoes").hide()
		nurse.show()
		door.show()
		player.position = body_position
		for entry in net_materials:
			entry[0].material_override = entry[1]
		get_node("Architecture/WorldEnvironment").environment.background_color = Color("090f21")
		camera.size = 16
		camera.position = Vector3(-5,8.5,14)
		camera.look_at(Vector3(-5,2.8,0))
		if stage==3:
			powered = true
			door.position.y = 5.5
			build_navigation()
			nurse.position = Vector3(0,0,-2.5)
			nurse_state = "chase"
			last_seen = player.position
			search_time = 5
			tell("GATE UNLOCKED / YOUR SIGNAL HAS BEEN DETECTED")
	player.velocity = Vector3.ZERO
	keys.clear()
	tone(180,0.3,-23)

func interact() -> void:
	if not blackwall:
		if not powered and player.position.distance_to(JACK)<1.8:
			toggle_world()
		elif powered and player.position.distance_to(EXIT_POS)<1.5:
			finish(true)
		return
	var p := player.position-ORIGIN
	if shifting:
		return
	if stage==0 and p.distance_to(NODE_A)<1.6:
		stage = 1
		anchor = NODE_A+Vector3(-1,0.1,0)
		rebuild(bridge_a)
		tell("ROUTE 01 RESTORED / CROSS THE WHITE BRIDGE")
	elif stage==1 and p.distance_to(NODE_B)<1.6:
		stage = 2
		anchor = NODE_B+Vector3(0,0.1,1.3)
		trace = 55
		sentinel.show()
		rebuild(bridge_b)
		tell("CONNECTION EXPOSED / REACH THE CORE BEFORE THE TRACE")
	elif stage==2 and p.distance_to(CORE)<1.6:
		stage = 3
		toggle_world()

func rebuild(bridge: Node3D) -> void:
	shifting = true
	tone(260,0.3)
	var tween := create_tween()
	tween.tween_property(bridge,"position:y",-0.5,1.3).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tween.finished.connect(func(): shifting = false)

func _physics_process(dt: float) -> void:
	if mode!="play":
		return
	notice_time = maxf(0,notice_time-dt)
	if not blackwall:
		super._physics_process(dt)
		objective.text = "Find the cyan street terminal. [E] JACK IN" if not powered else "Gate key acquired. Escape through the transit gate on the right."
		prompt.text = "[E / Q] JACK IN" if not powered and player.position.distance_to(JACK)<1.8 else ("[E] ESCAPE" if powered and player.position.distance_to(EXIT_POS)<1.5 else "")
		world_label.text = "REALSPACE / RAIN MARKET"
	else:
		clock += dt
		crouched = false
		figure.scale.y = 1
		var col := player.get_child(0) as CollisionShape3D
		(col.shape as CapsuleShape3D).height = 1.12
		col.position.y = 0.56
		var motion := Vector3(float(down(KEY_D) or down(KEY_RIGHT))-float(down(KEY_A) or down(KEY_LEFT)),0,float(down(KEY_S) or down(KEY_DOWN))-float(down(KEY_W) or down(KEY_UP))).normalized()
		var speed := run_speed if down(KEY_SHIFT) else walk_speed
		player.velocity.x = motion.x*speed
		player.velocity.z = motion.z*speed
		player.velocity.y -= 16*dt
		player.move_and_slide()
		if motion.length()>0.1:
			figure.rotation.y = lerp_angle(figure.rotation.y,atan2(motion.x,motion.z),dt*12)
		animate_figure(figure,clock*9,motion.length()*0.45)
		if player.position.y < -4:
			player.position = ORIGIN+anchor
			player.velocity = Vector3.ZERO
			tell("SIGNAL RESTORED AT LAST NODE")
		var target := ORIGIN+Vector3(clampf(player.position.x-100,-7,8),1,0)
		camera.position = target+Vector3(1.5,11,18)
		camera.look_at(target)
		objective.text = ["01 / Reach the first red node. [E] Reconstruct the bridge.","02 / Cross the bridge, then head UP to the second node.","03 / Cross the second bridge RIGHT. [E] Extract and disconnect.","EXTRACTED"][stage]
		world_label.text = "NETSPACE / GHOST PROTOCOL    /    [Q] DISCONNECT ONLY AT ENTRY"
		status.text = "TRACE %02d s" % ceili(trace) if stage==2 else "CONNECTION STABLE"
		status.modulate = Color("ff6677") if stage==2 else Color("99e4ed")
		var p := player.position-ORIGIN
		prompt.text = ""
		if (stage==0 and p.distance_to(NODE_A)<1.6) or (stage==1 and p.distance_to(NODE_B)<1.6):
			prompt.text = "[E] RECONSTRUCT ROUTE" if not shifting else "RECONSTRUCTING..."
		elif stage==2 and p.distance_to(CORE)<1.6:
			prompt.text = "[E] EXTRACT KEY / RETURN TO YOUR BODY"
		if stage==2:
			trace -= dt
			sentinel.position.x = lerpf(-10,10,1-trace/55)
			sentinel.rotation.z += dt*0.22
			if trace<=0:
				finish(false)
	if notice_time>0:
		prompt.text = notice

func finish(won: bool) -> void:
	super.finish(won)
	title.text = "SIGNAL / FREE" if won else "CONNECTION / LOST"
	subtitle.text = "You rebuilt the route, stole the key, and escaped.\n\nNIGHTFALL / GHOST PROTOCOL DEMO\nR / PLAY AGAIN" if won else "The trace reached you."+ ("\nReach the core and press E before time runs out." if blackwall else "\nBreak sight and hide beneath the market stalls.")+"\n\nR / RESTART"
