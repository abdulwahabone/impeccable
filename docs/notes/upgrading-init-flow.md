# Upgrading `/impeccable init`


### New questions that add additional context to `PRODUCT.md`
[`product-md-planned-additions.md`](product-md-planned-additions.md)


### Document design md

#### Blank Repo

Currently it starts with

`Before interviewing: "There's no existing visual system to scan. I'll ask five quick questions to seed a starter DESIGN.md. You can re-run `/impeccable document` once there's code, to capture the real tokens and components. OK?"`

I would like to change it so first we can ask the user to add assets they already have

##### Questions in Chat

1. Aseets upload
- Logos
- Reference/product images
- Moodboards
This will give us additional context which is very useful

2. Three named references — brands, products, printed objects. Not adjectives.

3. One anti-reference — what it should NOT feel like. Also named.

Next we detect if the user harness has image gen and if he allows us to generate a few images for visual cues for brand color palette selection. If he allows and he dosent have image gen capability, we can ask him to put the flux API in the env

##### Questions in Local browser

Then the local browser will start and
Vertical Slide View
1. First slide will be about Amount of color, Full pallete, drenched, etc
2. We will show visual cues in an interactive way. Once the user selects a visual cue
3. We will lay out the color palette in a way that is similar to the google stich design md tokens, because thats how we have done so far and it has worked.
4. Font slide, we will show a but a font pairs, and will ask the user to select which one suits him best.
6. Type slide — pick one
5. Motion energy — pick one.
6. Border Radii - pick one.
7. Elevation Depth - pick one.
8. Iconogragy - pick one of the free open source packs, they will see a list of icons from each pack with links that opens on new tab where they can search other icons to check if the icons they want exists.

Each of these slide will be modular and the output from each slide will account to a seperate section in the design md

#### Existing Repo

If a repo is existinga and a user refreshes the deisgn md, the agent will look into the design md and see which sections are missing and then ask those questions and run the slides in the local browser for the questions that are missing.


### Aesthetics during the questionaire (Low priority but would be a Wow moment)
[`init-aesthetics.md`](init-aesthetics.md)


### Out of scope
Feel free to suggest to move them in
- I think we should ask the suer if he has any existing design.md or existing figma we should ask the user to paste it. For figma we need a user to follow a few steps to export the variables json
