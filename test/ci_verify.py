import json, re
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
OUT = "C:/Users/rakes/AppData/Local/Temp/ci_verify"
import os; os.makedirs(OUT, exist_ok=True)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1500, "height": 1000})
        # login (cookie lands in context)
        r = ctx.request.post(f"{BASE}/api/auth/login",
                             data=json.dumps({"username": "admin", "password": "nexera-admin"}),
                             headers={"Content-Type": "application/json"})
        print("login:", r.status)
        page = ctx.new_page()
        page.goto(f"{BASE}/ledger/commercial-intelligence")
        page.wait_for_load_state("networkidle")

        # --- research Sonny's + first competitor via the target grid buttons ---
        # buttons in the "Sonny's vs Competitors" card read "Research" (or "Refresh")
        def research_nth(n, label):
            btns = page.get_by_role("button", name=re.compile(r"^(Research|Refresh|…)$"))
            print(f"  target buttons found: {btns.count()}")
            try:
                with page.expect_response(
                    lambda resp: "/api/ci/competitor-research" in resp.url, timeout=120000
                ) as ri:
                    btns.nth(n).click()
                resp = ri.value
                data = resp.json()
                print(f"  [{label}] HTTP {resp.status} estimated={data.get('estimated')} products={len(data.get('products',[]))}")
            except Exception as e:
                print(f"  [{label}] research wait failed:", e)
            page.wait_for_timeout(3000)  # let saveSnapshot + state settle
            print(f"  researched {label}")

        for n, lbl in [(0, "Sonny's"), (1, "competitor-1"), (2, "competitor-2")]:
            print(f"researching target {n} ({lbl})...")
            research_nth(n, lbl)

        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/00_research.png", full_page=True)

        # --- walk each engine tab, capture row signal ---
        tabs = ["Positioning", "SKU Comparison", "Pricing Strategy",
                "New Business", "News Center", "Executive Action Center"]
        report = {}
        for i, t in enumerate(tabs):
            try:
                page.get_by_role("button", name=t, exact=True).first.click()
            except Exception as e:
                report[t] = f"TAB CLICK FAIL: {e}"; continue
            page.wait_for_timeout(2000)
            main_area = page.locator("main").last.inner_text()
            empty = ("Research Sonny" in main_area or "EngineEmpty" in main_area
                     or "Research the" in main_area or "is computed" in main_area)
            # crude row count: lines that look like data
            lines = [l for l in main_area.split("\n") if l.strip()]
            report[t] = {
                "chars": len(main_area),
                "looks_empty": empty,
                "first_lines": lines[:6],
            }
            page.screenshot(path=f"{OUT}/{i+1:02d}_{t.replace(' ','_')}.png", full_page=True)

        print("\n===== ENGINE TAB REPORT =====")
        print(json.dumps(report, indent=2)[:4000])
        browser.close()

if __name__ == "__main__":
    main()
