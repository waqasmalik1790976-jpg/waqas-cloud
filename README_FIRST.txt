GITHUB SLIP COPY FIX
=====================

This fix is for:
waqasmalik1790976-jpg/waqas-cloud

Problem fixed:
When "Slip Copy" is clicked, the top of the slip / "Meezan Bank" heading can be cut off.

What to do:
1. Open your GitHub repository.
2. Open index.html.
3. Find the existing function:
   async function slipCopy(i,btn){
4. Delete that complete function.
5. Paste the function from SLIP_COPY_FIX.txt.
6. Commit changes.
7. Wait for Vercel to redeploy.

IMPORTANT:
Do not replace the whole index.html with this text file.
Only replace the slipCopy() function.

The fix removes the old marginTop:10px and paddingTop:2px during capture and
adds safe capture spacing so the complete heading remains visible.
