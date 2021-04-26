class Music {
  constructor(isRunning) {
    this.track = 0;
    this.player = document.createElement('audio');
    this.player.preload = true;
    this.player.src = `https://sebsauvage.net/ambient/${Music.tracks[this.track]}`;
    this.player.volume = 0.1;
    this.player.onerror = this.next.bind(this);
    this.player.onended = this.next.bind(this);
    if (isRunning) this.player.play();
  }

  dispose() {
    const { player } = this;
    if (!player.paused) {
      player.pause();
      player.src = '';
    }
  }

  resume() {
    const { player } = this;
    if (player.paused) {
      player.play();
    }
  }

  next() {
    const { player } = this;
    const { tracks } = Music;
    this.track = (this.track + 1) % tracks.length;
    player.src = `https://sebsauvage.net/ambient/${tracks[this.track]}`;
    player.play();
  }
}

Music.tracks = [
  'Auditive_Escape/Auditive_Escape__Holoscape__Citrine_Fuse.mp3',
  'Auditive_Escape/Auditive_Escape__Holoscape__The_Grass_Trialogue.mp3',
  'Auditive_Escape/Auditive_Escape__Synesthesia__Projectal.mp3',
  'Auditive_Escape/Auditive_Escape__The_Conundrum__4_Octaves_Higher.mp3',
  'Auditive_Escape/Auditive_Escape__The_Conundrum__Air_Like_Water.mp3',
  'Auditive_Escape/Auditive_Escape__The_Conundrum__Cette_journee.mp3',
  'Ben_Prunty/Ben_Prunty__BONUS_Federation.mp3',
  'Ben_Prunty/Ben_Prunty__BONUS_Horror.mp3',
  'Ben_Prunty/Ben_Prunty__Civil_(Explore).mp3',
  'Ben_Prunty/Ben_Prunty__Colonial_(Explore).mp3',
  'Ben_Prunty/Ben_Prunty__Cosmos_(Explore).mp3',
  'Ben_Prunty/Ben_Prunty__Engi_(Explore).mp3',
  'Ben_Prunty/Ben_Prunty__Mantis_(Battle).mp3',
  'Ben_Prunty/Ben_Prunty__MilkyWay_(Explore).mp3',
  'Ben_Prunty/Ben_Prunty__Wasteland_(Explore).mp3',
  'Ben_Prunty/Ben_Prunty__Zoltan_(Battle).mp3',
  'Ben_Prunty/Ben_Prunty__Zoltan_(Explore).mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__02__The_Secret_Place.mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__03__Matta.mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__04__Signals.mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__05__An_Ending_(Ascent).mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__06__Under_Stars_II.mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__07__Drift.mp3',
  'Brian_Eno/Brian_Eno_and_Daniel_Lanois__Apollo_(Atmospheres_and_Soundtracks)__12__Stars.mp3',
  'Brian_Eno/Brian_Eno__Ambient_1_Music_For_Airports__01__1_1.mp3',
  'Brian_Eno/Brian_Eno__Ambient_1_Music_For_Airports__03__1_2.mp3',
  'Brian_Eno/Brian_Eno__Ambient_1_Music_For_Airports__04__2_2.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__01_First_Light.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__02_Steal_Away.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__03_The_Plateaux_Of_Mirror.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__04_Above_Chiangmai.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__05_An_Arc_Of_Doves.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__07_The_Chill_Air.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__08_Among_Fields_Of_Crystal.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__09_Wind_In_Lonely_Fences.mp3',
  'Brian_Eno/Brian_Eno__Ambient_2_The_plateaux_of_mirror__10_Failing_Light.mp3',
  'Brian_Eno/Brian_Eno__Ambient_3_Days_Of_Radiance__04_Meditation_1.mp3',
  'Brian_Eno/Brian_Eno__Ambient_3_Days_Of_Radiance__05_Meditation_2.mp3',
  'Brian_Eno/Brian_Eno__Ambient_4_On_Land__A_Clearing.mp3',
  'Brian_Eno/Brian_Eno__Ambient_4_On_Land__Dunwich_Beach,_Autumn_1960.mp3',
  'Brian_Eno/Brian_Eno__Ambient_4_On_Land__Lantern_Marsh.mp3',
  'Brian_Eno/Brian_Eno__Ambient_4_On_Land__Lizard_Point.mp3',
  'Brian_Eno/Brian_Eno__Ambient_4_On_Land__The_Lost_Day.mp3',
  'Brian_Eno/Brian_Eno__Ambient_4_On_Land__Unfamiliar_Wind_(Leeks_Hills).mp3',
  'C418_One/c418__One__01_cliffside_hinson.mp3',
  'C418_One/c418__One__03_independent_accident.mp3',
  'C418_One/c418__One__04_danny_makes_chiptune.mp3',
  'C418_One/c418__One__07_impostor_syndrome.mp3',
  'C418_One/c418__One__08_buildup_errors.mp3',
  'C418_One/c418__One__09_for_the_sake_of_making_games.mp3',
  'C418_One/c418__One__10_preliminary_art_form.mp3',
  'C418_One/c418__One__12_lost_cousins.mp3',
  'C418_One/c418__One__13_total_drag.mp3',
  'C418_One/c418__One__15_the_weirdest_year_of_your_life.mp3',
  'C418_One/c418__One__16_swarms.mp3',
  'C418_One/c418__One__18_pr_department.mp3',
  'C418_One/c418__One__20_one_last_game.mp3',
  'C418_One/c418__One__22_wooden_love.mp3',
  'C418_One/c418__One__26_jayson_glove.mp3',
  'Cousin_Silas/Cousin_Silas__And_Memories_Fade.mp3',
  'Cousin_Silas/Cousin_Silas__AriaWithScrewdriver.mp3',
  'Cousin_Silas/Cousin_Silas__Drone25WithAddedGuitar.mp3',
  'Cousin_Silas/Cousin_Silas__TheBlueRoom.mp3',
  'Cousin_Silas/Cousin_Silas__UponMoonlitOceans.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__02__Puzzle.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__05__Beacon.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__07__Formations.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__08__Legend.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__09__Compass.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__10__Forgotten.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__14__Spirit.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__15__Nature.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__16__Knowledge.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__18__Memory.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__20__Nocturne.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__21__Age.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__24__Home.mp3',
  'Disasterpeace/Disasterpeace__FEZ_OST__25__Reflection.mp3',
  'fuckmylife/fuckmylife_Minecraft_02_test.mp3',
  'fuckmylife/fuckmylife_Minecraft_03_c418_and_mau5.mp3',
  'gurdonark/gurdonark__Afterword.mp3',
  'gurdonark/gurdonark__Bowen_Hill.mp3',
  'gurdonark/gurdonark__Charles_the_Cat.mp3',
  'gurdonark/gurdonark__Chilla.mp3',
  'gurdonark/gurdonark__Distillation.mp3',
  'gurdonark/gurdonark__Ending_the_Drought_(featuring_Shagrugge).mp3',
  'gurdonark/gurdonark__Exurb.mp3',
  'gurdonark/gurdonark__Gray_Sky_Blue_Sky.mp3',
  'gurdonark/gurdonark__High-tech_Hunger.mp3',
  'gurdonark/gurdonark__Morning_Dream.mp3',
  'gurdonark/gurdonark__Night_Rain_in_April.mp3',
  'gurdonark/gurdonark__Orb_Spider.mp3',
  'gurdonark/gurdonark__Potato_Dawn.mp3',
  'gurdonark/gurdonark__Rhonda_Jean_Barton.mp3',
  'gurdonark/gurdonark__Scissortail_Flycatcher.mp3',
  'gurdonark/gurdonark__Snow_Geese_at_Hagerman_Wildlife_Preserve.mp3',
  'gurdonark/gurdonark__William_and_Caroline_(Nebulae).mp3',
  'Harold_Budd/Harold_Budd-Robin_Guthrie__Open_Book.mp3',
  'Harold_Budd/Harold_Budd-Robin_Guthrie__Outside_Silence.mp3',
  'Harold_Budd/Harold_Budd-Robin_Guthrie__Snowfall.mp3',
  'Harold_Budd/Harold_Budd__Adult.mp3',
  'Jon_Hopkins/Jon_Hopkins__Contact_note__04__Searchlight.mp3',
  'Jon_Hopkins/Jon_Hopkins__Contact_note__07__Glasstop.mp3',
  'Jon_Hopkins/Jon_Hopkins__EP1__01__Fairytale.mp3',
  'Jon_Hopkins/Jon_Hopkins__EP1__02__Song_One.mp3',
  'Jon_Hopkins/Jon_Hopkins__EP1__03__The_End.mp3',
  'Jon_Hopkins/Jon_Hopkins__Insides__08__Small_Memory.mp3',
  'Jon_Hopkins/Jon_Hopkins__Insides__10__Autumn_Hill.mp3',
  'Jon_Hopkins/Jon_Hopkins__Opalescent__01__Elegiac.mp3',
  'Jon_Hopkins/Jon_Hopkins__Opalescent__02__Private_Universe.mp3',
  'Jon_Hopkins/Jon_Hopkins__Opalescent__03__Halcyon.mp3',
  'Jon_Hopkins/Jon_Hopkins__Opalescent__04__Opalescent.mp3',
  'Kevin_Kendle/Kevin_Kendle__Brimstone.mp3',
  'Kevin_Kendle/Kevin_Kendle__The_hermit.mp3',
  'Kevin_Kendle/Kevin_Kendle__The_lovers.mp3',
  'Kevin_Kendle/Kevin_Kendle__The_wheel_of_fortune.mp3',
  'Kevin_Kendle/Kevin_Kendle__Yellow_roses.mp3',
  'lowercase_noises/Lowercase_Noises__A_Haunt_Of_Jackals.mp3',
  'lowercase_noises/Lowercase_Noises__A_Highway_Shall_Be_There.mp3',
  'lowercase_noises/Lowercase_Noises__Beauty_Into_Wreck.mp3',
  'lowercase_noises/Lowercase_Noises__Broke_Through_The_Ice.mp3',
  'lowercase_noises/Lowercase_Noises__I_Need_Thee.mp3',
  'lowercase_noises/Lowercase_Noises__Passage.mp3',
  'lowercase_noises/Lowercase_Noises__Peeling_Crayons.mp3',
  'lowercase_noises/Lowercase_Noises__Rushes.mp3',
  'lowercase_noises/Lowercase_Noises__Song_For_No_One.mp3',
  'lowercase_noises/Lowercase_Noises__Stars.mp3',
  'lowercase_noises/Lowercase_Noises__The_Darkness_Is_As_Light.mp3',
  'lowercase_noises/Lowercase_Noises__Will_You_Catch_Me_If_I_Blow_Away_Pt1.mp3',
  'mika/mika__Fall_to_pieces-Silence.mp3',
  'misc/Altus__Home_Away_From_Home.mp3',
  'misc/Andrea_Baroni__PartiallyOffline.mp3',
  'misc/Ben_Babbitt__Kentucky_Route_Zero-_Act_III__Hall_of_the_Mountain_King.mp3',
  'misc/Bluejooz__Powder.mp3',
  'misc/Bluejooz__The_Surf_At_Abersoch.mp3',
  'misc/Borrtex__Changing.mp3',
  'misc/Borrtex__Desire.mp3',
  'misc/Borrtex__It_Starts_With_Patience.mp3',
  'misc/Borrtex__Snowflake.mp3',
  'misc/Borrtex__The_Bright_Morning_Star.mp3',
  'misc/Borrtex__We_Are_Saved.mp3',
  'misc/Carl_Anderson__010413.mp3',
  'misc/Cash__Distant_Pt2.mp3',
  'misc/ek2__Lost_Fragments.mp3',
  'misc/George_Johnson__Creation_of_Planets.mp3',
  'misc/Hazy__Cosmos.mp3',
  'misc/Hazy__Manifest.mp3',
  'misc/James_Taylor__Loop_Hole.mp3',
  'misc/Leyland_Kirby__We_drink_to_forget_the_coming_storm__Eight.mp3',
  'misc/Leyland_Kirby__We_drink_to_forget_the_coming_storm__One.mp3',
  'misc/Lowercase_Noises__This_Is_For_Our_Sins__Silence_of_Siberia.mp3',
  'misc/Melorman__Deep_(Northcape_Remix).mp3',
  'misc/Michael_Meara__Abstraction.mp3',
  'misc/Michael_Meara__Tidal.mp3',
  'misc/Michel_Banabila__Ringdijk_excerpt.mp3',
  'misc/Morcheeba__Slow_down_(stretched).mp3',
  'misc/Morcheeba__The_Sea_(stretched).mp3',
  'misc/Night_Note__Pass_Over_The_Tannhauser_Gate.mp3',
  'misc/Northcape__Glasshouse__Eukaryote.mp3',
  'misc/Northcape__Glasshouse__Glasshouse.mp3',
  'misc/Pawel_Ikgy__Open_Your_Eyes.mp3',
  'misc/Robbie_Dooley__Decompress.mp3',
  'misc/Spectrumshift__Rachel.mp3',
  'misc/Steve_Gane__Halcyon.mp3',
  'misc/The_Rosen_Corporation__Sidewalk_Diner.mp3',
  'misc/Tony_Anderson__Younger.mp3',
  'misc/Tycho__Dive__A_Walk.mp3',
  'misc/Tycho__Dive__Daydream.mp3',
  'Mogwai_hoert_Ambient/mh02_Mogwai_hoert_Ambient_-_01_Legoego_-_The_Barely_Noticed_Death_Of_Dr_Zhivagos_Cat.mp3',
  'Mogwai_hoert_Ambient/mh02_Mogwai_hoert_Ambient_-_08_Recue_-_Between_Stations.mp3',
  'MrLou/MrLou__Abnormal_Perfection_(Ambient_mix).mp3',
  'MrLou/MrLou__Ending_Chapter_5.mp3',
  'MrLou/MrLou__Fading_Shades.mp3',
  'MrLou/MrLou__Moments.mp3',
  'Siddhartha_Barnhoorn/Siddhartha_Barnhoorn__Antichamber__01_Beginnings_I.mp3',
  'Siddhartha_Barnhoorn/Siddhartha_Barnhoorn__Antichamber__02_Beginnings_II.mp3',
  'Siddhartha_Barnhoorn/Siddhartha_Barnhoorn__Antichamber__06_The_Final_Puzzle.mp3',
  'Tangerine_Dream/Tangerine_Dream__Sequent_C.mp3',
  'Tangerine_Dream/Tangerine_Dream__Sudden_Revelation.mp3',
  'Thomas_Kessler/Thomas_Kessler__Ambient_piano_diaries__december_11.mp3',
  'Thomas_Kessler/Thomas_Kessler__Ambient_piano_diaries__february_20.mp3',
  'Thomas_Kessler/Thomas_Kessler__Ambient_piano_diaries__january_02.mp3',
  'Thomas_Kessler/Thomas_Kessler__Ambient_piano_diaries__july_10.mp3',
  'Thomas_Kessler/Thomas_Kessler__Ambient_piano_diaries__march_27.mp3',
  'Vangelis/Vangelis__Blade_Runner_Blues.mp3',
  'Vangelis/Vangelis__Soil_Festivities__01__Movement_1.mp3',
  'Vangelis/Vangelis__Soil_Festivities__02__Movement_2.mp3',
];

{
  const { length } = Music.tracks;
  const rng = new Uint32Array(length);
  crypto.getRandomValues(rng);
  for (let i = length - 1; i >= 0; i -= 1) {
    const random = rng[i] % length;
    const temp = Music.tracks[i];
    Music.tracks[i] = Music.tracks[random];
    Music.tracks[random] = temp;
  }
}

export default Music;
