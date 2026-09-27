# Renders committed as evidence, not as decoration

`gates/shots/` is gitignored, so a rendering produced during a build lives only in that container and cannot
be pointed at from a job. The build lane's definition of done requires "a before-and-after rendering at
375x730 with a red box on the change, its path named on the job", which is impossible against an ignored
directory. So renders that are EVIDENCE for a closed job are copied here, named `<item>-<before|after>-<geo>.png`.

## #424, the lesson demo row's "Other lines" button

Red box = the button. Green box = ITS OWN ROW, which is the box the defect was against and the box no
assertion in the suite was comparing until this build. Both boxes carry their measured right edges.

| file | what it shows |
|---|---|
| `otherlines-before-320x568.png` | the defect: button 189.73..312.30 against a row ending at 295.44, so 16.86px outside its own row, with its right end cut. Rendered from the shipped #423 bundle (md5 `c243fbd805ff`). |
| `otherlines-after-320x568.png` | fixed: button 200.83..295.42, 0.02px INSIDE the row, label "Other lines" complete and uncut. |
| `otherlines-before-375x730.png` | Kunal's own phone, before. |
| `otherlines-after-375x730.png` | Kunal's own phone, after - **deliberately identical to the frame above**: same 169.17px box ending at exactly 375.00, same 14px font, same "♟ Other lines (3)". That is not a missing render, it is the claim. His Z-06 condition ("nothing changes at the widths I use") shown rather than asserted. |
