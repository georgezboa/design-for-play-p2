# CHAPTER 03 · MOVE AS ONE

## Complete Dialogue Script V01

Status: **WRITING LOCK FOR GEORGE REVIEW**  
Parent design: `CHAPTER_03_MOVE_AS_ONE_NARRATIVE_LOCK.md`  
Language: English runtime copy  
Estimated spoken/read length on critical path: 12–15 minutes  
Optional object reading: 3–6 additional minutes

---

## Script notation

- `AUTO`: line plays without a response choice.
- `CHOICE`: visible player responses.
- `VOICE`: internal response visible only to Butch/player.
- `STATE`: persistent narrative flag, not visible text.
- `OBJECT`: world interaction rather than a conversation menu.
- `[P]`, `[T]`, `[N]`: PATTERN, TENDERNESS and NERVE approaches.
- All branches converge on the critical path. A response changes tone and later
  callbacks, never whether the chapter can finish.

---

## S00 · Tram threshold

**Trigger:** Chapter 3 begins. The first Mara is a silhouette in the train's
second window. The second Mara is visible on the fountain bench.

**PUBLIC ADDRESS — AUTO**  
`Civic movement review begins at eighteen hundred. Travelers without an active
pass must remain where they are.`

**BUTCH — AUTO**  
`Mara?`

The fountain woman looks toward the train. She does not stand.

**PATTERN — VOICE**  
`Same scarf. Same height. Different coat. She is looking at the second carriage
window, not at you.`

**TENDERNESS — VOICE**  
`She heard the name. Her shoulders moved before her face did.`

**NERVE — VOICE**  
`Twenty metres of paving and one camera. Go.`

**CHOICE S00-A**

1. `Walk straight to her.` → `STATE openingApproach=direct`
2. `Look through the train window first.` → `STATE openingApproach=confirm`
3. `Read the notice beside the door.` → `STATE openingApproach=procedure`

### S00-A1 · Direct

Butch starts toward the fountain. The scanner paints him amber before he reaches
the clock.

**PUBLIC ADDRESS**  
`Traveler outside declared route. Return to the brass plate.`

**NERVE**  
`It said return because stop would sound like force.`

Proceed to S02.

### S00-A2 · Train window

The glass reflects Butch over the first Mara's silhouette. Her scarf is tied
around her wrist. Her face remains hidden by the window pillar.

**BUTCH**  
`Are you awake?`

The silhouette does not answer.

**TENDERNESS**  
`You want her to turn around before you look at the woman outside. You want the
problem to choose an order.`

**PATTERN**  
`Two matching scarves are visible in one line of sight. That is already more
evidence than the city intends to keep.`

Proceed to S01.

### S00-A3 · Door notice

**OBJECT TEXT**  
`TRANSIT STATUS SUSPENDED — DUPLICATE PASSENGER RECORD. SUBJECT MUST REMAIN AT
DESIGNATED COLLECTION POINT.`

Someone has written beneath it in pencil:

`HER NAME IS NOT A STATUS.`

**PATTERN**  
`The printed notice names no person. The handwriting does.`

**NERVE**  
`Collection point. A bench becomes a cage when the sentence is printed neatly.`

Proceed to S01.

---

## S01 · Platform objects

These three short interactions are available before the first scanner attempt.

### S01-PASS · Night-train ticket reader

**OBJECT:** Butch inserts his punched witness ticket.

The reader flashes amber, then cyan. No destination appears.

**PATTERN**  
`The train recognizes an action stamped into paper. The city reader beside it
recognizes an identity stored somewhere else.`

**BUTCH**  
`And neither one says where I belong.`

`STATE inspectedNightReader=true`

### S01-SPEAKER · Public-address speaker

The metal cone has a round dent. A brass queue token numbered 18 is trapped
inside the grille.

**NERVE**  
`Somebody already argued with the speaker. The speaker kept the evidence.`

**PATTERN**  
`The announcement pauses every seven seconds to listen. Nothing in the square
speaks during the gap.`

`STATE inspectedSpeaker=true`

### S01-MAP · Tram route map

The public map shows six numbered lines. The night train is absent. Someone has
drawn a small door in cyan pencil at the edge of the paper.

**TENDERNESS**  
`A route drawn by someone who needed it to exist before it arrived.`

**NERVE**  
`Or by someone tired of being told that absence from a map is the same as
absence.`

`STATE inspectedMap=true`

If the player has not attempted the crossing, objective remains `REACH THE WOMAN
AT THE FOUNTAIN.`

---

## S02 · First scanner return

**Trigger:** Butch enters the scanner field without a learned routine.

The beam changes teal → amber → wine-red. Butch freezes for 350ms and is returned
to the brass curb plate beside the clock.

**PUBLIC ADDRESS**  
`Movement does not correspond to declared public purpose.`

**BUTCH**  
`I declared nothing.`

**PATTERN**  
`Exactly. Look at the market. Nobody there is merely walking. They are carrying,
waiting, paying, returning.`

**TENDERNESS**  
`The woman watched the whole return. She did not laugh.`

**NERVE**  
`Try the people before you try the machine again.`

`STATE scannerLessonSeen=true`  
Objective updates: `FIND OUT WHAT THE SCANNER ACCEPTS.`

Repeat failures before learning the routine use one line each:

1. **PATTERN:** `Same result. Intention has no visible shape.`
2. **NERVE:** `The plate is learning the soles of your shoes.`
3. **TENDERNESS:** `She has stopped watching. That may be worse.`

After the third repeat, the porter handcart and produce scale receive a stronger
amber interaction outline. No additional failure prose appears.

---

## S03 · Market entrance and Eda

**Trigger:** Butch enters the market court or touches an apple/crate/scale.

Eda is placing bruised apples into a cheaper crate. A porter pushes a handcart
between the stall and the receipt spike.

**EDA**  
`If you're buying fruit, buy it. If you're asking about the woman, take a queue
number like everybody else.`

**CHOICE S03-A**

1. `What queue?`
2. `Why is she sitting at the fountain?`
3. `Two apples.`
4. `[N] You know I am not here for fruit.`

### S03-A1 · What queue

**EDA**  
`Transit Ministry. Brass dispenser, green door. It gave her forty-three and then
gave nobody anything for an hour.`

**BUTCH**  
`Did she speak to the clerk?`

**EDA**  
`She spoke. He found a rule that let him stop listening.`

Unlock S04 queue dispenser. Return to S03-B.

### S03-A2 · Why she is sitting

**EDA**  
`Her pass stopped working before lunch. Ministry told her to wait. She has been
very obedient about it, which is probably why nobody has helped.`

**TENDERNESS**  
`Eda says obedient the way other people say injured.`

**BUTCH**  
`You know her?`

**EDA**  
`I know what she buys. That is more than the clerk asked.`

Return to S03-B.

### S03-A3 · Two apples

**EDA**  
`Sweet or cheap?`

**CHOICE S03-A3**

1. `One of each.`
2. `Two sweet.`
3. `Two cheap.`
4. `Whatever she buys.`

If 1 or 4:

**EDA**  
`That is what she buys. One sweet, one cheap. Every Thursday.`

If 2:

**EDA**  
`She would tell you that is wasteful. I assume she would tell you. She has never
needed to tell me.`

If 3:

**EDA**  
`That is not thrift. That is punishment with a receipt.`

Eda places two apples on the scale. The porter stops. When the needle settles,
he turns the cart, waits for the receipt tear and returns.

**PATTERN**  
`Cart reaches brass line. Scale needle settles. Paper tears. Three public events,
always in that order.`

`STATE appleChoice=mixed|sweet|cheap|mara`  
Unlock S03-C routine observation.

### S03-A4 · Nerve approach

**EDA**  
`No. You are here because a woman is trapped and you want me to make your panic
useful. Buy something or ask a better question.`

**NERVE**  
`Fair hit. Stay upright.`

This does not close the conversation. Return to S03-B with Nerve trust +1.

### S03-B · Follow-up questions

Available after any opening branch:

1. `What does the scanner want from them?`
2. `Has the woman at the fountain been here before?`
3. `Did she say my name?`
4. `Where do I get a queue number?`
5. `That's all.`

**EDA, scanner**  
`The porter carries. I weigh. The office takes its paper. The scanner likes work
it can name.`

**BUTCH**  
`And if he walks without the cart?`

**EDA**  
`Then he is a man crossing a square. Apparently that is suspicious.`

**EDA, has Mara been here**  
`Every Thursday. Two apples. Drinks half a cup from that thermos and leaves the
other half hot.`

**TENDERNESS**  
`A place kept for somebody. Not proof of who. Proof that somebody was expected.`

**EDA, did she say my name**  
`She asked whether the night train still had a passenger who walked too fast.`

**BUTCH**  
`That was all?`

**EDA**  
`It was enough for her.`

`STATE heardWalkedTooFast=true`

**EDA, queue number**  
`Green door. Brass dispenser. Do not pull twice. It considers that a second
person.`

---

## S03-C · Porter routine

**Trigger:** Player holds Observe on porter or handles all three anchors.

### Partial observation release

If the player stops before completion:

**PATTERN**  
`You saw motion, not the agreement. Watch until every object has answered.`

Nothing is stored. The porter repeats after a short pause.

### Complete observation

1. Handcart crosses the brass line. Wheel squeaks three times. `MOVE`.
2. Apples settle on the scale. Porter rests both hands on cart. `WAIT`.
3. Eda tears the receipt and seats it on the spike. Porter returns. `RETURN`.

**PATTERN**  
`Carry. Wait. Return. The scanner accepts a relationship distributed across
three people and four objects.`

**NERVE**  
`It accepts a job. Borrow the job.`

**TENDERNESS**  
`The porter looks relieved when the paper tears. Repetition can be shelter even
when it is also a cage.`

**BUTCH**  
`I only need the shelter.`

`STATE routineLearned=true`  
Objective updates: `CHECK THE WOMAN'S TRANSIT RECORD.`

### Object barks within market

**Produce scale, before apples:**  
`The enamel is worn through beneath the weights Eda uses most. Accuracy has a
favorite place to stand.`

**Apple crate:**  
`The top fruit is polished. The lower layer is bruised where nobody making a
display expects you to look.`

**Handcart:**  
`The third wheel complains at the same point in every turn. The porter adjusts
his shoulder before it happens.`

**Receipt spike:**  
`Yesterday's papers are stacked beneath today's. Every purchase has been made
sharp enough to store.`

**Queue stanchion at market:**  
`The brass is clean at hip height. Thousands of bodies have agreed to stand
exactly this far apart.`

---

## S04 · Queue dispenser

**Trigger:** Player handles the brass queue dispenser at Transit Ministry.

The machine prints `43`. Another `43`, folded twice, is lodged under the window.

**PATTERN**  
`Same number. The machine did not advance after her. The queue has been waiting
for a person the clerk already refused.`

**NERVE**  
`Pull it again.`

**CHOICE S04-A**

1. `Take both forty-three tickets.`
2. `Pull the handle again.`
3. `Leave her ticket where it is.`

If 1:

**TENDERNESS**  
`Her ticket is warm from the sunlight. Not from her hand anymore.`

`STATE maraQueueTicketTaken=true`

If 2: the dispenser produces a blank strip and locks.

**PATTERN**  
`The machine can duplicate a person or a number. It refuses to admit either was
its decision.`

`STATE dispenserJammed=true`

If 3:

**NERVE**  
`A restraint dressed as respect. You will still speak for her at the window.`

Proceed to S05.

---

## S05 · Clerk Sava

**Trigger:** Butch approaches the Ministry window after handling the dispenser.

Sava checks the wall clock, then the ticket in Butch's hand.

**SAVA**  
`Number forty-three.`

**BUTCH**  
`You already called forty-three.`

**SAVA**  
`Then this will be quick.`

**CHOICE S05-A**

1. `Her pass says DUPLICATE PASSENGER.`
2. `There is another woman with her face on my train.`
3. `Restore the pass.`
4. `[T] What happens to her at eighteen hundred?`

### S05-A1 · Duplicate status

**SAVA**  
`The pass is not expired. Expired records stay in the system. This one was
canceled because another active passenger answered to the same identity.`

**BUTCH**  
`Who canceled it?`

**SAVA**  
`The consolidation order carries no local signature.`

**NERVE**  
`There is always a person inside the passive voice. He is sitting in front of
you with ink on his thumb.`

Proceed to S05-B.

### S05-A2 · Another woman on train

Sava finally looks through the window toward the tram.

**SAVA**  
`Then your train is the problem registered to this case.`

**BUTCH**  
`She is a person.`

**SAVA**  
`That is not a category I can restore from this desk.`

**TENDERNESS**  
`He says desk because saying I would leave him alone with the sentence.`

Proceed to S05-B.

### S05-A3 · Restore the pass

**SAVA**  
`That is not a button I have.`

**NERVE**  
`There is always a button. Sometimes it looks like a clerk.`

**CHOICE S05-A3-B**

1. `[N] Then use the stamp.`
2. `[P] Show me the cancellation record.`
3. `[T] Tell me what you can do.`

Converge through S05-C approach outcomes.

### S05-A4 · Eighteen hundred

**SAVA**  
`The scanner returns her to the fountain until a collection vehicle arrives.`

**BUTCH**  
`A police vehicle?`

**SAVA**  
`The notice does not use that word.`

**TENDERNESS**  
`He has not looked at the fountain once. He already knows where she is.`

Proceed to S05-B.

### S05-B · Core questions

1. `Why does the scanner care how people walk?`
2. `Can paper get her through?`
3. `Who issued the consolidation order?`
4. `Did she say anything about me?`
5. `Give me whatever you can issue.`

**SAVA, movement**  
`A pass declares origin and destination. Movement review verifies public purpose
between them.`

**BUTCH**  
`By watching feet?`

**SAVA**  
`By watching whether a person remains part of the activity they declared.`

**PATTERN**  
`The city does not fear motion. It fears motion without a category.`

**SAVA, can paper help**  
`Paper tells the scanner where she ought to be. It will still watch how she gets
there.`

**SAVA, Archivist order**  
`Central Archive. Issued at 06:12. “Consolidate mutually exclusive passenger
records before compression.” I did not write it.`

**NERVE**  
`He wants credit for every verb except obeyed.`

**SAVA, did she mention me**  
`She described a man on a train. She said he would ask whether she remembered
him before he asked whether she was safe.`

**BUTCH**  
`Did she give a name?`

**SAVA**  
`No. I thought that was deliberate.`

`STATE maraPredictedQuestion=true`

Proceed to S05-C.

### S05-C · Approach outcomes

The player chooses one of three ways to obtain the temporary movement form.

#### Force

**BUTCH [N]**  
`Stamp the form or come explain the collection vehicle to her yourself.`

**SAVA**  
`Threatening a transit clerk remains an irregular civic activity.`

He closes the window. The movement form is left under the glass.

**NERVE**  
`He saved his job and abandoned the paper. Take the part that helps.`

`STATE butchApproach=force`  
Sava refuses further questions but later watches the final crossing.

#### Evidence

**BUTCH [P]**  
`My ticket records a witnessed action, not a stored identity. Stamp her
destination against this train.`

Sava compares the train punch with the canceled pass.

**SAVA**  
`These systems are not supposed to share authority.`

**BUTCH**  
`They do not need to agree. I need a destination on the form.`

Sava stamps `NIGHT TRAIN / SOUTH PLATFORM`.

`STATE butchApproach=evidence`

#### Appeal

**BUTCH [T]**  
`You cannot restore her identity. You can give her somewhere to walk.`

Sava looks at the fountain for the first time.

**SAVA**  
`The form will not make the scanner accept her.`

**BUTCH**  
`I know.`

Sava stamps `NIGHT TRAIN / SOUTH PLATFORM`.

**SAVA**  
`Do not make me regret putting my number on it.`

**TENDERNESS**  
`His number. At last, a person inside the sentence.`

`STATE butchApproach=appeal`

All paths set `temporaryForm=true` and objective `REACH MARA USING THE MARKET
ROUTINE.`

### Ministry object barks

**Clerk stamp:**  
`The handle is blackened where Sava's thumb rests. Permission has been applied
often enough to change the wood.`

**Ink pad:**  
`Blue at the center, dry at the edges. Even authority runs out from the outside
in.`

**Temporary form:**  
`Origin: FOUNTAIN. Destination: NIGHT TRAIN. Purpose: TRANSFER. The route between
the words is blank.`

**Cigarette tray:**  
`Every cigarette has been crushed at the same length. Sava schedules even the
part of his shift that is killing him.`

---

## S06 · Optional Archive loop

**Trigger:** Player approaches Archive steps before crossing.

A redacted ordinance is pinned beneath glass. The case title is visible:
`CIVIC REGULARITY DURING RESOURCE CONTRACTION`.

**PATTERN**  
`The first version classified groups by shared destination. The amendment
changed it to shared behaviour. Someone discovered that destinations could be
faked more easily than habits.`

**TENDERNESS**  
`The margin contains four names, each crossed out in a different ink. Rules have
authors before they become weather.`

**NERVE**  
`Take the amendment.`

**CHOICE S06-A**

1. `Photograph it with the ticket reader.`
2. `Remove the paper from the case.`
3. `Leave it under glass.`

All set `archiveOrdinanceSeen=true`. Removing it also sets
`archiveOrdinanceTaken=true` and causes a quiet alarm light, but no gameplay
penalty. The evidence opens a new final line with Mara and changes Sava's window
reaction if visited afterward.

---

## S07 · Borrowed crossing

**Trigger:** Player selects destination inside fountain court after learning the
routine.

The temporary form visibly folds into Butch's coat. His route adopts the porter
semantics:

1. Carry an empty apple crate to the scale-side brass line.
2. Wait as the crosswalk signal changes and the scanner beam passes.
3. Return the crate to Eda's marked cart position, then continue with the crowd
   during the scanner's accepted phase.

### Wrong object/routine

If Butch enters carrying nothing:

**PUBLIC ADDRESS**  
`Declared transfer lacks transferred material.`

**NERVE**  
`The city has discovered pockets.`

If he leaves before the WAIT phase:

**PATTERN**  
`You copied the route and omitted the agreement. The needle must settle.`

If he walks against the RETURN phase:

**EDA, from across square**  
`You are stealing the bad crate.`

Failure returns Butch locally without losing the form or learned routine.

### Success

The beam remains teal. Eda tears a blank receipt at the correct moment even
though no sale occurs.

**EDA**  
`Bring the crate back when you bring her.`

**TENDERNESS**  
`A small lie performed by four people. The scanner calls it public order.`

Butch enters fountain court. `STATE reachedMara=true`.

---

## S08 · Fountain objects before Mara speaks

The player may inspect these before starting the conversation.

### Canceled pass

Mara's pass lies beneath the fountain bench, face down. The back carries Eda's
Thursday receipt: one sweet apple, one cheap.

**PATTERN**  
`The city canceled a record. The market continued keeping one.`

### Bench thermos

One cup remains warm. The second metal cup is clean and screwed beneath the lid.

**TENDERNESS**  
`She brought two cups and drank alone.`

### Fountain coins

Two currencies, a brass transit token and one plain washer lie beneath the
water.

**NERVE**  
`The washer is the only honest object here. It admits it cannot buy anything.`

### Mara's shoes

The outer heel of her left shoe is worn lower. Her stride will pull slightly
left when she is tired.

**PATTERN**  
`Do not correct it. Match it.`

This inspection provides an early spacing assist during the final walk.

---

## S09 · Mara at the fountain

**Trigger:** Player clicks Mara or sits on the wet half of the bench.

**BUTCH**  
`Mara. The train is behind me. We need to go now.`

She looks past him toward the second window and remains seated.

**CHOICE S09-A**

1. `Do you know me?`
2. `There is another you on the train.`
3. `Your pass was canceled because of us.`
4. `Stand up. We have four minutes.`
5. `Sit beside her.`

### S09-A1 · Do you know me

Mara looks at Butch's punched ticket, then at his face. She says nothing.

**TENDERNESS**  
`You made the first question about yourself. She expected that.`

If `maraPredictedQuestion=true`:

**PATTERN**  
`Prediction confirmed. This tells you about your habits, not her identity.`

Return to S09-B.

### S09-A2 · Another Mara

Mara nods once toward the train window.

**BUTCH**  
`Can you see her?`

She holds up two fingers, then points to the cyan scarf at her neck.

**NERVE**  
`She is not surprised. You are late to the worst fact in the square.`

Return to S09-B.

### S09-A3 · Pass canceled because of us

Mara takes the temporary form, reads Sava's number and folds the paper around her
canceled pass.

**TENDERNESS**  
`An apology without the word. Better than a claim, not yet better than harm.`

`STATE admittedResponsibility=true`

Return to S09-B.

### S09-A4 · Stand up

Mara stays seated.

**NERVE**  
`You crossed the square to issue the same instruction as the loudspeaker.`

**BUTCH**  
`Please.`

She points to the dry train, the wet fountain paving, then to Butch's feet: slow
down.

Return to S09-B.

### S09-A5 · Sit beside her

Butch sits on the wet seat. Water darkens his coat.

Mara slides the warm thermos cup toward him.

**TENDERNESS**  
`No recognition. No refusal. A cup made available to the person who arrived.`

`STATE satWithMara=true`

Return to S09-B.

### S09-B · Lockdown interruption

After two player responses, or immediately if fewer than 90 seconds remain:

Market shutters close. Porter leaves. Queue ropes retract. The scanner changes
from a rotating sweep to fixed lanes.

**PUBLIC ADDRESS**  
`Civic movement review is now active. Unscheduled groups must separate.`

Mara stands.

**MARA**  
`You brought her with you.`

**BUTCH**  
`You can see her?`

**MARA**  
`Second window. She has my scarf tied around her wrist.`

**CHOICE S09-C**

1. `Which one of you is Mara?`
2. `Does she know me?`
3. `I came back for you.`
4. `We can argue on the train.`
5. `[If archive seen] The order calls you mutually exclusive.`

### S09-C1 · Which Mara

**MARA**  
`The clerk asked me that for an hour. It did not improve with repetition.`

**BUTCH**  
`I need to understand what is happening.`

**MARA**  
`You need me to make it smaller.`

`STATE maraResponse=identity`

### S09-C2 · Does she know me

**MARA**  
`You reached me and asked about yourself.`

**BUTCH**  
`I do not remember who I was.`

**MARA**  
`That is frightening. It is not my job to become your memory.`

`STATE maraResponse=memory`

### S09-C3 · Came back for you

**MARA**  
`You came to collect an answer. I am still deciding whether to come with it.`

If `satWithMara=true`:

**MARA**  
`Sitting down helped.`

`STATE maraResponse=rescue`

### S09-C4 · Argue on train

**MARA**  
`There is already a woman on that train who may disagree with me.`

**BUTCH**  
`The train kept her safe.`

**MARA**  
`Then show me it can keep two people safe without choosing between them.`

`STATE maraResponse=practical`

### S09-C5 · Archive order

**BUTCH**  
`The order calls both passenger records mutually exclusive.`

**MARA**  
`Records can be mutually exclusive. People mostly stand next to each other and
make it somebody else's paperwork.`

**PATTERN**  
`A theory with shoes on. Test it.`

`STATE maraResponse=archive`

All branches converge:

**MARA**  
`The market pattern is gone. If you walk ahead, the scanner will split us.`

**BUTCH**  
`What do you want me to do?`

**MARA**  
`Walk beside me.`

Objective updates: `GET BOTH OF YOU BACK TO THE TRAIN.`

---

## S10 · Pair-learning failures

The return route teaches paired movement through local, readable failure. Mara
never teleports and no conversation state is lost.

### Butch moves too far ahead

The line between them stretches wine-red; scanner points separate.

**MARA**  
`Stop walking ahead of me.`

**BUTCH**  
`The scanner is closing.`

**MARA**  
`I know. Match me.`

### Butch walks too close

**MARA**  
`Beside me. Not on my shoes.`

**NERVE**  
`Coordination has dignity and a measurable radius.`

### Butch drifts too far away

**MARA**  
`If I have to look for you, we are not moving together.`

**TENDERNESS**  
`Attention is part of the distance.`

### Wrong lane change

Mara begins a diagonal crossing. If Butch continues straight:

**MARA**  
`I am going around the wet stone.`

If the player inspected her shoe wear:

**PATTERN**  
`Left heel. Fatigue pulls her inward. Follow the correction, not the ideal line.`

### Player repeatedly commands destination without matching

After three rejected route clicks:

**MARA**  
`Stop choosing the destination for one second. Watch my first step.`

The next three Mara footsteps receive a restrained cyan highlight.

---

## S11 · Successful paired crossing

Success requires three visible synchronized steps, maintained spacing and one
matched diagonal lane change.

Step one:

**PATTERN**  
`Same pace.`

Step two:

**TENDERNESS**  
`She no longer checks whether you are still there.`

Step three:

**NERVE**  
`Now make the camera accept what the city rejected.`

The scanner turns teal. Its classification text changes from `DUPLICATE
PASSENGER` to `COORDINATED PAIR / TRANSFER IN PROGRESS`.

If Sava window remains open:

- force route: Sava watches but does not reopen the window.
- evidence route: Sava stamps a second blank form without being asked.
- appeal route: Sava removes his numbered badge before the collection vehicle
  arrives.

Eda leaves the empty apple crate on the tram platform as promised.

---

## S12 · Train door

Mara presents the city pass. The reader flashes wine-red:

`PASSENGER RECORD ALREADY ACTIVE.`

**MARA**  
`There. The simple answer.`

**CHOICE S12-A**

1. `Use Butch's punched witness ticket with hers.`
2. `Ask the first Mara to come to the door.`
3. `Put the temporary movement form in the reader.`
4. `Stand beside Mara and wait.`

### S12-A1 · Witness ticket

Butch places his Chapter 1 ticket beneath Mara's canceled pass. The reader plays
the recorded three paired footsteps. Amber changes to cyan. Door unlocks.

**PATTERN**  
`The train did not resolve the identity. It recognized what happened between
two passengers.`

### S12-A2 · Call first Mara

The silhouette approaches behind the glass but does not enter the doorway. She
places her wrist, with the scarf tied around it, against the window.

The second Mara places two fingers against the opposite side of the glass.

The train reader records both gestures and unlocks.

**TENDERNESS**  
`Recognition without introduction.`

### S12-A3 · Temporary form

The reader rejects the form once. Sava's stamp glows amber where it names the
night train as destination. Butch adds his punched ticket; the reader combines
destination with witnessed movement and unlocks.

**NERVE**  
`Paper came as far as paper could. People did the rest.`

### S12-A4 · Wait beside Mara

After two seconds, the train replays the three synchronized steps by itself and
unlocks.

**BUTCH**  
`It was watching.`

**MARA**  
`It was remembering.`

All routes set `duplicatePassengerAccepted=true`.

---

## S13 · Closing conversation

The door opens. The first Mara remains visible in the second window.

**MARA**  
`When we go in, do not introduce us.`

**CHOICE S13-A**

1. `I won't.`
2. `I need to know which of you remembers me.`
3. `She already knows you are here.`
4. `Walk in beside me.`

### S13-A1 · I won't

**MARA**  
`Good.`

She waits for Butch to align beside her.

### S13-A2 · Need to know

**MARA**  
`You may learn that. You may not learn it tonight.`

**BUTCH**  
`I do not know how long the train has.`

**MARA**  
`Then do not spend the time turning one of us into an answer.`

### S13-A3 · She knows

**MARA**  
`I know.`

**BUTCH**  
`How?`

**MARA**  
`She moved away from the window when I looked at her.`

### S13-A4 · Walk beside me

Mara almost smiles.

**MARA**  
`You finally noticed.`

All converge:

**MARA**  
`Stay beside me.`

Butch and Mara cross the threshold shoulder to shoulder. The train produces the
amber witness pulse. Both cyan scarves occupy the same frame for one beat.

**PUBLIC ADDRESS, distant as door closes**  
`Unscheduled group no longer present.`

**NERVE**  
`Correct.`

Chapter complete.

---

## S14 · Optional object dialogue bank

These lines may fire once each. They are not required for completion.

### Newspaper rack

Headline: `EVACUATION DISTRICT RECONNECTED AFTER UNSCHEDULED POWER DIVERSION`.
The photograph shows the Chapter 2 tower. Mara has been cropped out of the edge.

**PATTERN**  
`The event remains. The person who made it matter has been removed from the
frame.`

### Public telephone

**RECORDED VOICE**  
`Your call establishes irregular location. Please remain where you are while we
determine why you called.`

**NERVE**  
`Hang up before assistance becomes a vehicle.`

### Lost glove

**TENDERNESS**  
`Child-size. Damp at the fingertips. Somebody waited here without putting both
hands in their pockets.`

### Thermos

**EDA, if asked later**  
`Yes, it is hers. No, I am not giving it to you. Bring her here and she can take
it herself.`

### Market awning crank

Lowering the awning interrupts the beam for half a second, then the scanner
raises its camera.

**PATTERN**  
`Cover changes line of sight. It does not change classification.`

### Pigeon-feed tin

Pigeons flood the paving. Scanner ignores them.

**NERVE**  
`Wrong species for public order.`

### Clock toolbox

Three replacement hands, clean gears and no signed work order.

**PATTERN**  
`The clock is functioning. Nobody is authorized to touch the time.`

### Protest flyers

Printed: `A PERSON IS NOT A DUPLICATE FILE.` Most copies wrap bruised apples.

**EDA**  
`The paper was free. Wrapping is expensive.`

### Dog bowl

Inventory plate: `MINISTRY PROPERTY 1841`. The chain is attached to nothing.

**TENDERNESS**  
`They planned ownership before they planned the dog.`

### Umbrella stand

One dry umbrella has the same cyan repair stitch as Mara's scarf.

**PATTERN**  
`Possible shared owner. Possible shared repairer. Do not promote resemblance to
identity again.`

### Cleaning cone

Moving it reveals two old paired footprints painted over in municipal gray.

**NERVE**  
`Somebody passed this test before the city learned to call it a violation.`

### Fountain drain thread

**CHOICE:** take the short cyan thread or leave it.

If taken:

**TENDERNESS**  
`You have taken enough small things and called them proof.`

If left:

**PATTERN**  
`Evidence remains evidence when it is not in your pocket.`

---

## Implementation constraints

- No dialogue node may block the critical path because of a failed stat check.
- S03, S05 and S09 must remain readable while the square stays visible behind
  the dialogue UI.
- No response may silently produce the same line and state as every other option.
- The first scanner attempt, borrowed routine and paired return are physical
  sequences; dialogue supports them but does not solve them.
- The chapter must remain complete if every optional object in S14 is ignored.
- Runtime localization IDs should follow `ch03.sXX.speaker.intent`, not use the
  English line as a key.
