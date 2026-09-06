// Forward-moving optional conversations for the Prologue archive props.
// Choices change the player's interpretation of the evidence, not puzzle
// state or the outcome of the scene.

export const BUTCH_NARRATIVE = Object.freeze({
  name: 'BUTCH',
  role: 'lost property clerk',
  tint: 0xc4b9a7,
});

// Narrative evidence belongs to the room where the player first encounters
// it.  The earlier implementation waited until that room was already solved,
// which made the moving suitcases impossible to inspect during normal play.
export function getNarrativeUnlockState(tutorialPuzzle) {
  const p = tutorialPuzzle;
  const stageIndex = Number.isInteger(p?.stageIndex) ? p.stageIndex : -1;
  return {
    0: Boolean(p?.briefed),
    1: Boolean(p?.stageComplete?.[0]),
    2: Boolean(p?.stageComplete?.[2]),
    3: stageIndex >= 3 || Boolean(p?.stageComplete?.[3]),
    4: stageIndex >= 4 || Boolean(p?.stageComplete?.[4]),
    5: Boolean(p?.stageComplete?.[5]),
  };
}

export function suitcaseHasUnreadEvidence(state, itemCount) {
  const readCount = state?.readItems instanceof Set
    ? state.readItems.size
    : Array.isArray(state?.readItems)
      ? state.readItems.length
      : 0;
  return readCount < itemCount;
}

export const NARRATIVE_SCRIPTS = Object.freeze({
  'claim-ticket': {
    lines: [
      'This claim was filed for Mara Velez. The surname was torn from the paper, but the punch number is intact.',
      'The depot copied that number into its ledger on October 14, 1978. No one came back for the drawer.',
    ],
    choices: [
      {
        label: 'Was the name removed on purpose?',
        response: [
          'I cannot prove that. The tear is clean, but the paper has been handled for years.',
          'What I can tell you is that the number still matches every item we found farther down the car.',
        ],
      },
      {
        label: 'Did the station try to reach her?',
        response: [
          'Twice. One notice went to a rented room near the city terminal. The other went to an orchard outside Bellwether.',
          'Neither letter was returned, and neither address was removed from the ledger.',
        ],
      },
    ],
  },
  'route-cards': {
    lines: [
      'These route cards were issued six days apart under Mara\'s claim number.',
      'One was for the city commuter line. The other was for the orchard stop, three counties west.',
    ],
    choices: [
      {
        label: 'Maybe one card belonged to someone else.',
        response: [
          'That was the first assumption. The clerk checked the punch pattern and the signature block.',
          'Both cards were hers. The filing system simply had no place for two regular destinations.',
        ],
      },
      {
        label: 'So she travelled between both places.',
        response: [
          'That is the plainest reading. The city card was used on weekdays. The orchard card was punched most Saturdays.',
          'Nothing in the record says she had to choose one address and abandon the other.',
        ],
      },
    ],
  },
  'signed-copies': {
    lines: [
      'The tube holds two property statements, both signed by Mara on the same day.',
      'One lists a room key and a transit pass. The other lists sewing thread, work gloves, and a family photograph.',
      'The depot marked the forms as a duplicate claim even though the contents were different.',
    ],
    choices: [
      {
        label: 'Why did the depot call them duplicates?',
        response: [
          'Same passenger, same punch number, same day. The form allowed one destination and one household.',
          'The clerk followed the form. The form was the part that was wrong.',
        ],
      },
      {
        label: 'Did Mara challenge the decision?',
        response: [
          'She wrote a note asking them to keep both claims open. It is clipped to the second statement.',
          'There is no reply from the depot.',
        ],
      },
    ],
  },
  'phase-iv-envelope': {
    lines: [
      'The envelope is addressed to Mara\'s younger sister at the orchard. It has a city postmark but no stamp.',
      'The first page explains that Mara took a temporary room near the terminal because the early shift began before the first westbound train.',
    ],
    choices: [
      {
        label: 'Why was the letter never sent?',
        response: [
          'The last paragraph is unfinished. She stopped after writing that she would be home Saturday.',
          'There is no evidence of anything dramatic. She may simply have packed the letter with the rest of her papers.',
        ],
      },
      {
        label: 'So the city room was for work.',
        response: [
          'Yes. A place to sleep between shifts, not a replacement for the orchard house.',
          'The depot recorded it as a second permanent address anyway.',
        ],
      },
    ],
  },
  'phase-iv-city-postcard': {
    lines: [
      'The city postcard shows the old terminal before the renovation.',
      'On the back Mara wrote the time of her first shift and the number of the room she rented nearby.',
    ],
  },
  'phase-iv-orchard-postcard': {
    lines: [
      'The orchard postcard is from the Bellwether packing cooperative.',
      'Mara circled a window on the second floor and wrote, “Rosa moved into my room until winter.”',
    ],
  },
  'phase-iv-tag': {
    lines: [
      'The luggage tag has Mara\'s claim number and two destination abbreviations written in different inks.',
      'The second abbreviation was added later, but it was approved with the same depot stamp.',
    ],
  },
  'phase-v-city-key': {
    lines: [
      'A brass key stamped 4C. The rental receipt in the case places apartment 4C two blocks from the city terminal.',
      'The lease ran month to month and was paid through October 1978.',
    ],
    choices: [
      {
        label: 'She lived in the city, then.',
        response: [
          'During the workweek, yes. The utility bill shows very little weekend use.',
          'A room can be real without being the only place a person calls home.',
        ],
      },
      {
        label: 'It sounds more like a place to sleep.',
        response: [
          'That is how Mara described it in the letter. Bed, hot plate, one chair, close enough to walk to the early shift.',
          'The official record reduced all of that to “city resident.”',
        ],
      },
    ],
  },
  'phase-v-transit-pass': {
    lines: [
      'A monthly transit pass issued in Mara\'s name. The photograph is damaged, but the employee number is readable.',
      'It was used Monday through Friday for nine weeks. There are no weekend punches.',
    ],
  },
  'phase-v-thread': {
    lines: [
      'Heavy cotton thread from the Bellwether cooperative store.',
      'The same thread was used to repair the orchard coat packed beneath it.',
    ],
  },
  'phase-v-leaf': {
    lines: [
      'A pressed hawthorn leaf kept inside a wage envelope from the orchard cooperative.',
      'The envelope is dated the same month as the city transit pass.',
    ],
    choices: [
      {
        label: 'Then both records are accurate.',
        response: [
          'Yes. Mara worked in the city and still returned to the orchard when she could.',
          'The contradiction exists in the depot file, not in her life.',
        ],
      },
      {
        label: 'The depot wanted one simple answer.',
        response: [
          'That made the filing easier. It also made half of Mara\'s belongings look as if they belonged to a stranger.',
          'By the time someone corrected the ledger, the train had already separated the cases.',
        ],
      },
    ],
  },
  'retention-record': {
    lines: [
      'The retention slot kept both claims after the depot marked them as conflicting.',
      'A later clerk added a note: “Mara Velez maintained the city room for work and returned to Bellwether on weekends.”',
      'That note is the first part of the file that describes her life instead of forcing it into one address box.',
    ],
    choices: [
      {
        label: 'Who added the correction?',
        response: [
          'The initials are R. Velez. Most likely Rosa, Mara\'s sister.',
          'She came to the depot in 1981 with copies of both leases and asked them to stop discarding one case as a duplicate.',
        ],
      },
      {
        label: 'Was Mara ever found?',
        response: [
          'There is no missing-person report in this file. The property was lost, not Mara.',
          'The last record says she collected the city case. The orchard case stayed on the train after this line closed.',
        ],
      },
    ],
  },
});

export function getNarrativeScript(id) {
  return NARRATIVE_SCRIPTS[id] ?? null;
}
