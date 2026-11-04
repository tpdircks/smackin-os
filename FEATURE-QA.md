# Smackin OS feature QA

Run this after a deploy, on the live GitHub Pages site, after a hard refresh.
The service worker keeps the previous shell until the cache name changes.
Confirm the footer or the browser application cache shows the CACHE version named in the deploy PR, then walk the rows below.

`npm test` runs the Node checks in `scripts/`. Those checks do not open a browser and do not write to Supabase. They cover Receive / Dock lot matching, COA file scope, COA hold rules, and the other pure helpers already in the repo. A green `npm test` does not replace this list.

Do not edit the Nov 4 2026 Rocky Mountain Dill Pickle / Cracked Pepper receipt until Receiving confirms it. Use a different PO for the multi-item drill.

| Flow | Steps | Expected | Owner |
| --- | --- | --- | --- |
| Dashboard | Open Dashboard. Read the overview. Open Daily metrics. Open the TV board and come back. | Overview loads stockouts, past-due demand, and inbound. Daily metrics renders. The TV board opens and Dashboard is still there when you return. | Ops |
| Demand | Open Demand. Open the open-orders board, Now Running, Schedule, and Forecast. | Each tab renders. Counts do not jump to another department's board. Import stays an action and does not submit by being opened. | Demand |
| Purchasing | Open Purchasing. Open POs, Due in, the 1.5oz tab, and SPS. | Open POs and the buy list render. Due in lists expected receipts. Switching tabs does not mark a PO received. | Purchasing |
| Receive | Receiving, then Receive. Receive one known item with supplier, PO, carrier, lot, and qty. | Stock increases. The Dock log opens on a new row for that item, lot, and qty. The form is still filled if the log does not confirm a row. | Receiving |
| Receive item | On Receive, type or pick a box, lid, label, or maltodextrin, then a seasoning. | The page stays usable after the item matches. You can leave the field, open Dock, and refresh. Packaging shows an expiration date. Seasoning, oil, and finished bags do not lock the tab. | Receiving |
| Dock | On the Dock, find the row just received. Edit it, change the qty, save. Cancel an edit without saving. | Edit changes only that row. Cancel leaves the saved qty. A second item is not updated. | Receiving |
| Services | Receiving, then Services. Open a service invoice if one exists. Start a new one and cancel. | The services list renders. Cancel does not create an invoice. Uniform / service copy is the services screen, not a dock receipt. | Receiving |
| Returns | Receiving, then Returns. Open an existing return. Start a new one and cancel. | The return list renders. Cancel does not write a return or move stock. | Receiving |
| Quarantine | Receiving, then Quarantine. Open the hold list. | Held lots show. Opening the list does not release a hold. | Quality |
| COA Yes / No / N/A | On Receive, pick a seed or seasoning. Set COA to Yes and receive a small qty on a test lot. Repeat on a second test lot with No. Repeat with N/A. | Yes stores Yes and does not hold. No on seed, seasoning, maltodextrin, oil, or stevia puts that lot on QA Hold. N/A stores N/A and does not hold. Bags and film do not get this hold. | Receiving |
| COA Hold release | Quality opens the held test lot and releases it. | The lot leaves QA Hold. The answer stays No. The release note records who released it. | Quality |
| COA PDF | On Receive, attach a small PDF for the test lot and finish the receipt. Open the Dock row and the Quality COA library. | The PDF is on that item's Dock row. A different item does not list that file. Removing the file before save does not upload it. | Receiving |
| Multi-item same PO | Receive two different items on one PO, one carrier, and the same typed lot (spaces and case only, such as `J1926` and `j 1926`). Attach a different PDF on each. | Two Dock rows. Each keeps its own item, qty, and PDF. The screen warns that the lot is already on the other item. The first row's qty does not become the second qty. | Receiving |
| Same item, same lot, same day | Receive more of the same item, same supplier, and same lot on the same day. | That Dock row updates. A different item that happens to use the lot is unchanged. | Receiving |
| Explicit Edit | Edit the first item's Dock row and save. | Only the edited row changes. | Receiving |
| Inventory | Open Inventory. Search one item. Open adjust / count, then cancel. Open one location. | On-hand matches the item you opened. Cancel does not post a count. A hold location is not cleared by opening it. | Inventory |
| Mixing | Open Mixing. Open Status, Seasoning, and Recipes. Open the batch record action and back out. | Today's mixing list renders. Backing out does not start a batch. | Mixing |
| P-Mac | Open P-Mac. Open Status, best-by lots, and Log output. Back out of log output without saving. | Status renders. Log output does not post a row if you leave it. `npm test` includes the prod-tracking sync check. | P-Mac |
| Fulfillment | Open Fulfillment. Open Retail and E-Commerce. Open the daily log and back out. | Retail and e-commerce stay separate counts. Leaving the daily log does not save a day. | Fulfillment |
| Shipping | Open Shipping. Open the shipment list and the shipping log. | ShipStation shipments render. Opening the log does not create a shipment. | Shipping |
| Quality | Open Quality. Open Checklists, COAs, SQF tasks, and Trace. Search one known lot. | Checklists render for today. COAs open the library. Trace shows that lot and does not release a hold. | Quality |
| Ops | Open Ops. Open Maintenance, People, and Settings. | Maintenance lists open requests. Settings opens. Nothing is reset or deleted by opening the tab. | Ops |
| Board mode | From Dashboard, Mixing, P-Mac, or Fulfillment, open the TV board. Leave it and open one operating tab. | The board fills the view it is meant to fill. Leaving it returns to a normal tab without a stuck overlay. | Ops |
