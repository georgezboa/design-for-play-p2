extends Node3D
## The authored room is baked to ward.tscn by bake.gd. Runtime only owns actors and rules.

@export var walk_speed: float = 2.6
@export var run_speed: float = 4.6
@export var crouch_speed: float = 1.35
@export var detection_seconds: float = 1.3
@export var nurse_speed: float = 3.3

var player: CharacterBody3D
var nurse: CharacterBody3D
var figure: Node3D
var nurse_figure: Node3D
var camera: Camera3D
var prompt: Label
var objective: Label
var status: Label
var overlay: ColorRect
var title: Label
var subtitle: Label
var beam: SpotLight3D
var fuse: Node3D
var door: StaticBody3D
var keys := {}
var mode := "title"
var has_fuse := false
var powered := false
var hidden := false
var crouched := false
var suspicion := 0.0
var clock := 0.0
var search_time := 0.0
var patrol_target := Vector3(5, 0, -2.5)
var nurse_state := "patrol"
var last_seen := Vector3.ZERO
var step_timer := 0.0
var hint := ""
var hum: AudioStreamPlayer
var gain := -32.0
var nav := AStarGrid2D.new()
var nav_clock := 0.0
var path := PackedVector2Array()
var blackwall := false
var city_materials: Array = []
var city_lights: Array = []
var world_label: Label
var city_signs: Array = []
var distortion: ColorRect
const FUSE_POS := Vector3(3.7, 0.55, -4.5)
const POWER_POS := Vector3(8.5, 0, 1.8)
const EXIT_POS := Vector3(11.5, 0, 1.8)
const HIDES := [Vector3(-3,0,0), Vector3(2,0,0), Vector3(6.3,0,1.7)]

func material(color: Color, metal := 0.0, emission := 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.metallic = metal
	m.roughness = 0.68
	if emission > 0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emission
	return m

func box(parent: Node, name_: String, pos: Vector3, size_: Vector3, mat: Material, solid := false) -> Node3D:
	var root: Node3D = StaticBody3D.new() if solid else Node3D.new()
	root.name = name_
	parent.add_child(root)
	root.position = pos
	var mesh := MeshInstance3D.new()
	var shape := BoxMesh.new()
	shape.size = size_
	mesh.mesh = shape
	mesh.material_override = mat
	root.add_child(mesh)
	if solid:
		var col := CollisionShape3D.new()
		var bounds := BoxShape3D.new()
		bounds.size = size_
		col.shape = bounds
		root.add_child(col)
	return root

func sign_(parent: Node, text_: String, pos: Vector3, size_: int, tint: Color) -> void:
	var label := Label3D.new()
	parent.add_child(label)
	label.text = text_
	label.position = pos
	label.font_size = size_
	label.pixel_size = 0.009
	label.modulate = tint
	label.outline_size = 1
	label.no_depth_test = false

func light_(parent: Node, pos: Vector3, color_: Color, energy: float, range_: float) -> void:
	var lamp := OmniLight3D.new()
	parent.add_child(lamp)
	lamp.position = pos
	lamp.light_color = color_
	lamp.light_energy = energy
	lamp.omni_range = range_
	lamp.shadow_enabled = true

func build_room() -> void:
	preload("res://city.gd").new().build(self)


func actor(name_: String, at: Vector3, scale_: float, coat: Color) -> CharacterBody3D:
	var body := CharacterBody3D.new()
	body.name = name_
	add_child(body)
	body.position = at
	var collision := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.23 * scale_
	capsule.height = 1.12 * scale_
	collision.shape = capsule
	collision.position.y = 0.56 * scale_
	body.add_child(collision)
	var model := Node3D.new()
	model.name = "Figure"
	body.add_child(model)
	model.scale = Vector3.ONE * scale_
	var torso := MeshInstance3D.new()
	var cloak := CylinderMesh.new()
	cloak.top_radius = 0.18
	cloak.bottom_radius = 0.32
	cloak.height = 0.68
	cloak.radial_segments = 12
	torso.mesh = cloak
	torso.material_override = material(coat)
	model.add_child(torso)
	torso.position.y = 0.61
	var head := MeshInstance3D.new()
	var hood := SphereMesh.new()
	hood.radius = 0.245
	hood.height = 0.46
	hood.radial_segments = 16
	hood.rings = 8
	head.mesh = hood
	head.material_override = material(coat)
	model.add_child(head)
	head.position.y = 1.02
	box(model,"Face",Vector3(0,1.01,0.205),Vector3(0.25,0.2,0.035),material(Color("171e24")))
	for side in [-1,1]:
		box(model,"LegL" if side < 0 else "LegR",Vector3(side*0.13,0.18,0),Vector3(0.14,0.35,0.17),material(Color("233039")))
		box(model,"ArmL" if side < 0 else "ArmR",Vector3(side*0.31,0.53,0),Vector3(0.13,0.5,0.16),material(coat))
	return body

func _ready() -> void:
	if not has_node("Architecture"):
		build_room()
	if Engine.is_editor_hint():
		return
	player = actor("Subject8",Vector3(-10,0,2.8),1,Color("d6a35c"))
	figure = player.get_node("Figure")
	nurse = actor("Caretaker",Vector3(1,0,-2.5),2.7,Color("939f96"))
	nurse_figure = nurse.get_node("Figure")
	box(nurse_figure,"Visor",Vector3(0,1.02,0.23),Vector3(0.34,0.075,0.03),material(Color("e46750"),0,2))
	var armor = material(Color("364858"),0.65)
	box(nurse_figure,"SignalPack",Vector3(0,0.66,-0.27),Vector3(0.43,0.46,0.23),armor)
	box(nurse_figure,"Antenna",Vector3(0.2,1.21,-0.28),Vector3(0.035,0.6,0.035),armor)
	box(nurse_figure,"Respirator",Vector3(0,0.89,0.25),Vector3(0.28,0.14,0.12),armor)
	for x in [-0.31,0.31]:
		box(nurse_figure,"ShoulderArmor",Vector3(x,0.8,0),Vector3(0.22,0.2,0.3),armor)
		box(nurse_figure,"Gauntlet",Vector3(x,0.3,0.02),Vector3(0.17,0.18,0.2),armor)
	for x in [-0.13,0.13]:
		box(nurse_figure,"Boot",Vector3(x,0.07,0.055),Vector3(0.18,0.15,0.29),armor)
	box(figure,"Satchel",Vector3(0,0.58,-0.24),Vector3(0.29,0.34,0.16),material(Color("324453")))
	box(figure,"SignalBadge",Vector3(-0.1,0.67,0.18),Vector3(0.045,0.1,0.03),material(Color("78c3d7"),0,1))
	beam = SpotLight3D.new()
	nurse_figure.add_child(beam)
	beam.position = Vector3(0,1.1,0.3)
	beam.rotation.y = PI
	beam.light_color = Color("e8b893")
	beam.light_energy = 2
	beam.spot_range = 9
	beam.spot_angle = 42
	beam.shadow_enabled = true
	fuse = box(self,"PowerCell",FUSE_POS,Vector3(0.22,0.45,0.22),material(Color("e8b568"),0.4,2))
	door = box(self,"LiftDoor",Vector3(10,1.6,1.8),Vector3(0.25,3.2,3),material(Color("506970")),true) as StaticBody3D
	build_navigation()
	camera = Camera3D.new()
	add_child(camera)
	camera.position = Vector3(-5,8.5,14)
	camera.look_at(Vector3(-5,2.8,0))
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 16
	camera.current = true
	make_ui()
	make_audio()
	setup_worlds()
	get_window().focus_exited.connect(func(): keys.clear())

func setup_worlds() -> void:
	for mesh in get_node("Architecture").find_children("*","MeshInstance3D",true,false):
		var original = mesh.material_override
		if not original is StandardMaterial3D:
			continue
		var dark = original.duplicate()
		dark.albedo_color = Color("302638") if not original.emission_enabled else Color("ee302f")
		if original.emission_enabled:
			dark.emission = Color("e82929")
			dark.emission_energy_multiplier = 1.4
		city_materials.append([mesh,original,dark])
	for lamp in get_node("Architecture").find_children("*","OmniLight3D",true,false):
		city_lights.append([lamp,lamp.light_color])
	for sign_node in get_node("Architecture").find_children("*","Label3D",true,false):
		city_signs.append([sign_node,sign_node.modulate])
	world_label = label_(overlay.get_parent(),Vector2(38,675),"REALSPACE  /  RAIN MARKET      [Q] CROSS THE BLACKWALL",14,Color("7bd1dd"))
	distortion = ColorRect.new()
	overlay.get_parent().add_child(distortion)
	distortion.size = Vector2(1280,800)
	distortion.mouse_filter = Control.MOUSE_FILTER_IGNORE
	distortion.color = Color(0.9,0.02,0.07,0)
	get_node("Architecture/BlackwallEchoes").hide()
	title.text = "RAIN MARKET"
	subtitle.text = "NIGHTFALL / A SIGNAL ON THE OTHER SIDE\n\nFind the amber relay. Power the transit gate. Escape.\nCrouch beneath market stalls to evade the Warden.\n\n[Q] Cross the Blackwall: the city remembers your position.\n\nENTER  /  BEGIN"

func toggle_world() -> void:
	blackwall = not blackwall
	for entry in city_materials:
		entry[0].material_override = entry[2] if blackwall else entry[1]
	for entry in city_lights:
		entry[0].light_color = Color("e63a45") if blackwall else entry[1]
	for entry in city_signs:
		entry[0].modulate = Color("e97a87") if blackwall else entry[1]
	get_node("Architecture/BlackwallEchoes").visible = blackwall
	get_node("Architecture/Rain").visible = not blackwall
	var env: Environment = get_node("Architecture/WorldEnvironment").environment
	env.background_color = Color("08040d") if blackwall else Color("090f21")
	env.ambient_light_color = Color("94435d") if blackwall else Color("7790c7")
	world_label.text = "BLACKWALL  /  RESIDUAL SIGNAL      [Q] RETURN TO REALSPACE" if blackwall else "REALSPACE  /  RAIN MARKET      [Q] CROSS THE BLACKWALL"
	world_label.add_theme_color_override("font_color",Color("ff7777") if blackwall else Color("7bd1dd"))
	distortion.color.a = 0.28
	create_tween().tween_property(distortion,"color:a",0.0,0.65)
	tone(65 if blackwall else 350,0.5,-19)

func build_navigation() -> void:
	nav.region = Rect2i(0,0,51,23)
	nav.cell_size = Vector2(0.5,0.5)
	nav.offset = Vector2(-12.5,-5.5)
	nav.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	nav.update()
	var solids := get_node("Architecture").find_children("*","StaticBody3D",true,false)
	if not powered:
		solids.append(door)
	for x in range(51):
		for z in range(23):
			var p := nav.get_point_position(Vector2i(x,z))
			for body in solids:
				if body.position.y < 0.2:
					continue
				var collision: CollisionShape3D = body.get_child(1)
				var size_: Vector3 = collision.shape.size
				if abs(p.x-body.position.x)<size_.x/2+0.68 and abs(p.y-body.position.z)<size_.z/2+0.68:
					nav.set_point_solid(Vector2i(x,z),true)
					break

func nearest_cell(pos: Vector3) -> Vector2i:
	var best := Vector2i.ZERO
	var distance := INF
	for x in range(51):
		for y in range(23):
			var cell := Vector2i(x,y)
			if nav.is_point_solid(cell):
				continue
			var d := nav.get_point_position(cell).distance_squared_to(Vector2(pos.x,pos.z))
			if d<distance:
				distance = d
				best = cell
	return best

func label_(parent: Node, pos: Vector2, text_: String, size_: int, tint := Color("dce6df")) -> Label:
	var l := Label.new()
	parent.add_child(l)
	l.position = pos
	l.text = text_
	l.add_theme_font_size_override("font_size",size_)
	l.add_theme_color_override("font_color",tint)
	return l

func make_ui() -> void:
	var ui := CanvasLayer.new()
	add_child(ui)
	label_(ui,Vector2(38,25),"N I G H T F A L L",22)
	label_(ui,Vector2(39,58),"07  /  RAIN MARKET",12,Color("89a7ac"))
	objective = label_(ui,Vector2(38,100),"",16)
	status = label_(ui,Vector2(950,32),"",16)
	prompt = label_(ui,Vector2(280,720),"",20)
	label_(ui,Vector2(38,768),"WASD  MOVE    SHIFT  RUN    C  CROUCH    SPACE  JUMP    E  INTERACT    Q  BLACKWALL    R  RETRY    ESC  PAUSE",12,Color("93a7a9"))
	overlay = ColorRect.new()
	ui.add_child(overlay)
	overlay.size = Vector2(1280,800)
	overlay.color = Color(0.02,0.035,0.045,0.84)
	title = label_(overlay,Vector2(170,240),"THE QUIET WARD",54)
	subtitle = label_(overlay,Vector2(175,330),"Your body is public property.\nFind a power cell. Restore the lift. Leave quietly.\n\nCrouch beneath the treatment tables to hide.\nThe caretaker sees movement and hears running.\n\nENTER  /  BEGIN",20)

func make_audio() -> void:
	hum = AudioStreamPlayer.new()
	add_child(hum)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = 22050
	stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
	stream.loop_end = 22050
	var data := PackedByteArray()
	data.resize(44100)
	for i in range(22050):
		var t := float(i)/22050
		var v := int((sin(TAU*55*t)*0.4+sin(TAU*83*t)*0.1)*12000)
		data.encode_s16(i*2,v)
	stream.data = data
	hum.stream = stream
	hum.volume_db = -32

func tone(freq: float, duration := 0.13, volume := -23.0) -> void:
	var sound := AudioStreamPlayer.new()
	add_child(sound)
	var wav := AudioStreamWAV.new()
	wav.format = AudioStreamWAV.FORMAT_16_BITS
	wav.mix_rate = 22050
	var count := int(22050*duration)
	var data := PackedByteArray()
	data.resize(count*2)
	for i in range(count):
		var envelope := pow(1.0-float(i)/count,2)
		data.encode_s16(i*2,int(sin(TAU*freq*i/22050)*18000*envelope))
	wav.data = data
	sound.stream = wav
	sound.volume_db = volume
	sound.finished.connect(sound.queue_free)
	sound.play()

func _input(event: InputEvent) -> void:
	if event is InputEventKey:
		keys[event.physical_keycode] = event.pressed
		if event.pressed and not event.echo:
			if event.physical_keycode == KEY_ENTER and mode == "title":
				mode = "play"
				overlay.hide()
				hum.play()
			if event.physical_keycode == KEY_R:
				get_tree().reload_current_scene()
			if event.physical_keycode == KEY_ESCAPE and mode in ["play","pause"]:
				mode = "pause" if mode == "play" else "play"
				overlay.visible = mode == "pause"
				title.text = "PAUSED"
				subtitle.text = "ESC  /  CONTINUE\nR  /  RESTART"
			if event.physical_keycode == KEY_E and mode == "play":
				interact()
			if event.physical_keycode == KEY_Q and mode == "play":
				toggle_world()
			if event.physical_keycode == KEY_SPACE and mode == "play" and player.is_on_floor() and not crouched:
				player.velocity.y = 4.7
			if event.physical_keycode == KEY_F:
				DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED if DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_FULLSCREEN else DisplayServer.WINDOW_MODE_FULLSCREEN)

func down(code: int) -> bool:
	return keys.get(code,false)

func interact() -> void:
	if not has_fuse and player.position.distance_to(FUSE_POS) < 1.25:
		has_fuse = true
		fuse.hide()
		tone(600,0.4)
	elif has_fuse and not powered and player.position.distance_to(POWER_POS) < 1.5:
		powered = true
		door.position.y = 5.5
		build_navigation()
		nurse_state = "chase"
		last_seen = player.position
		search_time = 8
		tone(90,1.2,-13)
	elif powered and player.position.distance_to(EXIT_POS) < 1.5:
		finish(true)

func finish(won: bool) -> void:
	mode = "won" if won else "caught"
	overlay.show()
	title.text = "UNREGISTERED EXIT" if won else "PLEASE REMAIN STILL"
	subtitle.text = "VESSEL: Your absence has been recorded.\n\nYou escaped Rain Market.\nR  /  PLAY AGAIN" if won else "The Warden has traced your signal.\n\nBreak its line of sight, then crouch under a market stall.\nR  /  TRY AGAIN"
	tone(420 if won else 65,0.7,-17)

func _physics_process(dt: float) -> void:
	if mode != "play":
		return
	clock += dt
	crouched = down(KEY_CTRL) or down(KEY_C)
	# Stay crouched when releasing the button under a solid tabletop.
	if not crouched and figure.scale.y<0.6:
		var query := PhysicsRayQueryParameters3D.create(player.position+Vector3(0,0.5,0),player.position+Vector3(0,1.4,0))
		query.exclude = [player.get_rid()]
		crouched = not get_world_3d().direct_space_state.intersect_ray(query).is_empty()
	var col := player.get_child(0) as CollisionShape3D
	(col.shape as CapsuleShape3D).height = 0.57 if crouched else 1.12
	col.position.y = 0.285 if crouched else 0.56
	figure.scale.y = 0.48 if crouched else 1.0
	var motion := Vector3(float(down(KEY_D) or down(KEY_RIGHT))-float(down(KEY_A) or down(KEY_LEFT)),0,float(down(KEY_S) or down(KEY_DOWN))-float(down(KEY_W) or down(KEY_UP))).normalized()
	var running := down(KEY_SHIFT) and not crouched
	var speed := crouch_speed if crouched else (run_speed if running else walk_speed)
	player.velocity.x = move_toward(player.velocity.x,motion.x*speed,dt*18)
	player.velocity.z = move_toward(player.velocity.z,motion.z*speed,dt*18)
	player.velocity.y -= 16*dt
	player.move_and_slide()
	player.position.x = clampf(player.position.x,-12.2,12.2)
	player.position.z = clampf(player.position.z,-5,5.3)
	hidden = false
	for p in HIDES:
		if crouched and abs(player.position.x-p.x)<1.35 and abs(player.position.z-p.z)<0.95 and player.position.y < 0.2:
			hidden = true
	if motion.length() > 0.1:
		figure.rotation.y = lerp_angle(figure.rotation.y,atan2(motion.x,motion.z),dt*12)
		step_timer += dt
		if step_timer > (0.27 if running else 0.48):
			step_timer = 0
			tone(100 if running else 150,0.06,-28 if crouched else -23)
	animate_figure(figure,clock*speed*3,motion.length()*0.45)
	update_nurse(dt,running and motion.length()>0.1)
	fuse.rotation.y += dt
	objective.text = "Find the amber relay behind the market stalls." if not has_fuse else ("Restore power at the transit console. [E]" if not powered else "The gate is open. Get inside. [E]")
	status.text = "HIDDEN" if hidden else ("RUN" if nurse_state == "chase" else ("BEING WATCHED" if suspicion>0.1 else "KEEP QUIET"))
	status.modulate = Color("ec8e77") if suspicion>0.1 or nurse_state=="chase" else Color("8fbdb1")
	prompt.text = ""
	if not has_fuse and player.position.distance_to(FUSE_POS)<1.25:
		prompt.text = "[E]  TAKE POWER CELL"
	elif has_fuse and not powered and player.position.distance_to(POWER_POS)<1.5:
		prompt.text = "[E]  RESTORE POWER  /  THIS WILL MAKE NOISE"
	elif powered and player.position.distance_to(EXIT_POS)<1.5:
		prompt.text = "[E]  LEAVE THE WARD"
	hum.volume_db = lerpf(hum.volume_db,-21.0 if nurse_state=="chase" else -32.0,dt*2)
	var camera_x := clampf(player.position.x+1.8,-5.0,5.0)
	camera.position.x = lerpf(camera.position.x,camera_x,1.0-exp(-dt*2))

func animate_figure(model: Node3D, phase: float, amount: float) -> void:
	model.get_node("LegL").rotation.x = sin(phase)*amount
	model.get_node("LegR").rotation.x = -sin(phase)*amount
	model.get_node("ArmL").rotation.x = -sin(phase)*amount*0.65
	model.get_node("ArmR").rotation.x = sin(phase)*amount*0.65

func update_nurse(dt: float, noisy: bool) -> void:
	var offset := player.position-nurse.position
	var distance := offset.length()
	var facing := Vector3(sin(nurse_figure.rotation.y),0,cos(nurse_figure.rotation.y))
	var sees := distance<8 and facing.dot(offset.normalized())>0.35 and not hidden
	if sees:
		var ray := PhysicsRayQueryParameters3D.create(nurse.position+Vector3(0,2.6,0),player.position+Vector3(0,0.45,0))
		ray.exclude = [nurse.get_rid()]
		var hit := get_world_3d().direct_space_state.intersect_ray(ray)
		sees = hit.get("collider") == player
	if sees:
		suspicion = minf(1,suspicion+dt/detection_seconds)
		last_seen = player.position
		search_time = 4
	else:
		suspicion = maxf(0,suspicion-dt*0.6)
	if noisy and distance<5.5 and nurse_state!="chase":
		last_seen = player.position
		nurse_state = "investigate"
		search_time = 3
	if suspicion >= 1:
		nurse_state = "chase"
	if nurse_state != "patrol":
		search_time -= dt
		if sees:
			last_seen = player.position
			search_time = 4
		if search_time<=0:
			nurse_state = "patrol"
	var target := patrol_target if nurse_state == "patrol" else last_seen
	if nurse.position.distance_to(patrol_target)<0.65 and nurse_state=="patrol":
		patrol_target.x = -6 if patrol_target.x>0 else 5
	nav_clock -= dt
	if nav_clock<=0:
		nav_clock = 0.35
		path = nav.get_point_path(nearest_cell(nurse.position),nearest_cell(target))
	while path.size()>1 and path[0].distance_to(Vector2(nurse.position.x,nurse.position.z))<0.4:
		path.remove_at(0)
	var dir := Vector3.ZERO
	if not path.is_empty():
		dir = Vector3(path[0].x,0,path[0].y)-Vector3(nurse.position.x,0,nurse.position.z)
		if dir.length()<0.18:
			dir = Vector3.ZERO
	var speed := nurse_speed if nurse_state=="chase" else 1.0
	dir = dir.normalized()
	nurse.velocity = Vector3(dir.x*speed,nurse.velocity.y-16*dt,dir.z*speed)
	nurse.move_and_slide()
	if dir.length()>0.1:
		nurse_figure.rotation.y = lerp_angle(nurse_figure.rotation.y,atan2(dir.x,dir.z),dt*3)
	animate_figure(nurse_figure,clock*speed*2,0.28)
	if distance<1.05 and not hidden:
		finish(false)
