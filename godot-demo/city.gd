extends RefCounted
## Procedural authoring only. bake.gd produces normal, individually editable scene nodes.
func build(w: Node3D) -> void:
	var root := Node3D.new()
	root.name = "Architecture"
	w.add_child(root)
	var steel = w.material(Color("1e293c"),0.7)
	var concrete = w.material(Color("273449"),0.2)
	var trim = w.material(Color("496474"),0.65)
	var cyan = w.material(Color("22bccb"),0,1.1)
	var pink = w.material(Color("d83783"),0,1.2)
	var amber = w.material(Color("ee9d4a"),0,1.1)
	var road = w.material(Color("152337"),0.65)
	road.roughness = 0.22
	w.box(root,"WetAsphalt",Vector3(0,-0.3,0),Vector3(26,0.6,12),road,true)
	w.box(root,"BackBoundary",Vector3(0,3.5,-5.7),Vector3(26,7,0.4),concrete,true)
	for x in [-12.8,12.8]:
		w.box(root,"SideBoundary",Vector3(x,1,-0.2),Vector3(0.4,2,12),steel,true)
	# Distant towers create a dense skyline above the pedestrian street.
	for i in range(11):
		var x := -20.0+i*3.9
		var h := 12.0+float((i*7)%13)
		w.box(root,"DistantTower",Vector3(x,h/2,-14-float(i%3)*3),Vector3(3.5,h,3),concrete)
		for y in range(4,int(h),2):
			for dx in [-0.9,0.0,0.9]:
				if (i+y+int(dx*10))%3 != 0:
					w.box(root,"ApartmentWindow",Vector3(x+dx,y,-12.4-float(i%3)*3),Vector3(0.28,0.65,0.03),cyan if i%3 else amber)
	# Street facades, recessed shutters, air conditioners, conduits and neon lettering.
	var names := ["KAIRO\nNOODLES","NEURAL\nEXCHANGE","HOTEL\nNO VACANCY","STATIC\nRECORDS","TRANSIT\nSECTOR 07"]
	for i in range(5):
		var x := -10.0+i*5
		w.box(root,"ShopFacade",Vector3(x,4.5,-6.1),Vector3(4.8,9,1.1),concrete)
		w.box(root,"ShopRecess",Vector3(x,1.7,-5.38),Vector3(4.2,3.2,0.12),steel)
		for y in range(11):
			w.box(root,"ShutterSlat",Vector3(x,0.4+y*0.23,-5.25),Vector3(3.6,0.06,0.04),trim)
		w.box(root,"ShopCanopy",Vector3(x,3.4,-4.55),Vector3(4.4,0.18,1.8),steel)
		w.box(root,"CanopyLight",Vector3(x,3.25,-3.72),Vector3(4.1,0.05,0.06),pink if i%2 else cyan)
		w.sign_(root,names[i],Vector3(x,4.65,-5.05),37,Color("fb70bc") if i%2 else Color("70e0eb"))
		w.box(root,"ACUnit",Vector3(x+1.4,6.3,-5.05),Vector3(1.1,0.7,0.5),trim)
		for j in range(6):
			w.box(root,"ACVent",Vector3(x+1.4,6.05+j*0.08,-4.76),Vector3(0.85,0.022,0.03),steel)
		w.box(root,"Drainpipe",Vector3(x-2.2,4,-5.1),Vector3(0.13,8,0.13),trim)
		for y in [7.2,8.3]:
			w.box(root,"UpperWindow",Vector3(x,y,-5.5),Vector3(1.7,0.65,0.04),amber if i%2 else cyan)
		w.light_(root,Vector3(x,3.1,-2.8),Color("cf3881") if i%2 else Color("329cc8"),1.7,7)
	# Vertical sign, overhead walkway, suspended utility lines.
	w.box(root,"VerticalSignCase",Vector3(-7.3,7,-4.4),Vector3(1.05,5,0.35),steel)
	w.sign_(root,"N\nI\nG\nH\nT",Vector3(-7.3,7,-4.15),46,Color("ff719f"))
	w.box(root,"Skybridge",Vector3(5,8,-7),Vector3(14,0.35,2.2),steel)
	for x in range(-2,13):
		w.box(root,"BridgeRailing",Vector3(x,8.7,-5.9),Vector3(0.06,1.3,0.06),trim)
	w.box(root,"BridgeTopRail",Vector3(5,9.35,-5.9),Vector3(14,0.07,0.07),trim)
	for z in [-4.0,-2.0,1.0]:
		for i in range(13):
			var x := -12.0+i*2
			w.box(root,"SaggingCable",Vector3(x,7.4+abs(x)*0.07,z),Vector3(2.05,0.035,0.035),steel)
	# Low vending stalls preserve the tested hide volumes without any medical furniture.
	for x in [-3.0,2.0,6.3]:
		var z := 1.7 if x>6 else 0.0
		w.box(root,"MarketCounter",Vector3(x,1.45,z),Vector3(3.3,0.22,2.2),trim,true)
		for dx in [-1.35,1.35]:
			for dz in [-0.8,0.8]:
				w.box(root,"StallLeg",Vector3(x+dx,0.7,z+dz),Vector3(0.12,1.4,0.12),steel,true)
		w.box(root,"CounterNeon",Vector3(x,1.38,z+1.12),Vector3(3.1,0.045,0.025),amber if x<0 else cyan)
		for j in range(5):
			w.box(root,"MerchandiseCrate",Vector3(x-0.9+j*0.42,1.75,z-0.45),Vector3(0.34,0.35,0.45),steel)
			w.box(root,"CrateReadout",Vector3(x-0.9+j*0.42,1.8,z-0.21),Vector3(0.21,0.06,0.02),pink if j%2 else amber)
	# A vending machine and meter at the original relay position.
	w.box(root,"RelayStand",Vector3(3.7,0.22,-4.5),Vector3(0.7,0.44,0.7),steel,true)
	w.sign_(root,"RELAY / 08",Vector3(3.7,1.3,-4.5),23,Color("f8ba65"))
	w.box(root,"TicketConsole",Vector3(8.8,0.9,0.8),Vector3(0.5,1.8,0.8),steel,true)
	w.box(root,"TicketScreen",Vector3(8.8,1.5,1.22),Vector3(0.4,0.3,0.025),cyan)
	w.box(root,"TransitArch",Vector3(11.5,3.4,0.3),Vector3(2.5,0.3,0.4),steel)
	w.sign_(root,"LAST TRAIN",Vector3(11.4,3.8,0.4),25,Color("6de2cb"))
	w.box(root,"GateLight",Vector3(11.5,1.8,-0.1),Vector3(1.9,3.4,0.04),cyan)
	w.light_(root,Vector3(11.3,2,1.0),Color("72d7b7"),2,6)
	w.light_(root,Vector3(-8,3.8,3),Color("809bc9"),1.3,8)
	w.light_(root,Vector3(1,4,3),Color("7896c3"),1.2,9)
	# Broken lane markings and drain grates.
	for x in range(-11,12,3):
		w.box(root,"LanePaint",Vector3(x,0.018,3.9),Vector3(1.4,0.018,0.055),trim)
		for j in range(6):
			w.box(root,"DrainGrate",Vector3(x+j*0.09,0.02,-3.3),Vector3(0.035,0.02,0.6),steel)
	# Stylized neon streaks in wet pavement; no expensive real-time reflection dependency.
	for i in range(48):
		var mat = w.material(Color("244861") if i%2 else Color("643050"),0.75)
		mat.roughness = 0.12
		var puddle = w.box(root,"WetReflection",Vector3(-11.5+float((i*17)%47)*0.5,0.013,-2.5+float((i*7)%17)*0.35),Vector3(0.12+float(i%5)*0.12,0.008,0.25+float(i%4)*0.2),mat)
		puddle.rotation.y = 0.12
	var rain := CPUParticles3D.new()
	rain.name = "Rain"
	root.add_child(rain)
	rain.position = Vector3(0,10,0)
	rain.amount = 650
	rain.lifetime = 1.3
	rain.emission_shape = CPUParticles3D.EMISSION_SHAPE_BOX
	rain.emission_box_extents = Vector3(13,2,5)
	rain.direction = Vector3(-0.12,-1,0)
	rain.initial_velocity_min = 9
	rain.initial_velocity_max = 12
	rain.gravity = Vector3(0,-3,0)
	var drop := BoxMesh.new()
	drop.size = Vector3(0.009,0.22,0.009)
	drop.material = w.material(Color("6888a7"),0,0.3)
	rain.mesh = drop
	var echoes := Node3D.new()
	echoes.name = "BlackwallEchoes"
	root.add_child(echoes)
	var red = w.material(Color("d7313f"),0,1.6)
	for i in range(55):
		var x := -12.0+float((i*11)%49)*0.5
		var y := 1.5+float((i*7)%25)*0.3
		w.box(echoes,"SignalFracture",Vector3(x,y,-3.8+float(i%4)),Vector3(0.02,0.3+float(i%6)*0.4,0.02),red)
	for x in [-8,-1,5,10]:
		w.box(echoes,"UnmooredBuilding",Vector3(x,10,-8),Vector3(2.2,3,2),steel).rotation.z = 0.2
		w.sign_(echoes,"SIGNAL LOST\nDO NOT FOLLOW",Vector3(x,4,-3),23,Color("ed555d"))
	var env := WorldEnvironment.new()
	env.name = "WorldEnvironment"
	root.add_child(env)
	env.environment = Environment.new()
	env.environment.background_mode = Environment.BG_COLOR
	env.environment.background_color = Color("090f21")
	env.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.environment.ambient_light_color = Color("7790c7")
	env.environment.ambient_light_energy = 0.65
	env.environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
