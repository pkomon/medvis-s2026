# generated using ChatGPT 5, manually adapted

from pathlib import Path
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError
import constants

URL = "https://worldhealthorg.shinyapps.io/glass-dashboard/_w_e19c46655b554cd08873fd015059a57f/#!/amr"

SELECT_INFECTION_ID = "#amr-resistance_antibiotics_year-infsys-select"
SELECT_PATHOGEN_ID = "#amr-resistance_antibiotics_year-pathogen-select"
SELECT_YEAR_ID = "#amr-resistance_antibiotics_year-year-select"
DOWNLOAD_ID = "#amr-resistance_antibiotics_year-dl-data"


def escape_filename(s: str) -> str:
    return (
        s.replace("/", "-")
        .replace("\\", "-")
        .replace(":", "")
        .replace("*", "")
        .replace("?", "")
        .replace('"', "")
        .replace("<", "")
        .replace(">", "")
        .replace("|", "")
        .replace(" ", "_")
        .replace("\n", "_")
        .strip("_")
    )


def wait_for_present(page, selector: str, timeout_ms: int = 120_000):
    POLLING_INTERVAL = 1000
    print(f"Waiting for {selector}... ", end="")

    for _ in range(timeout_ms // POLLING_INTERVAL):
        count = page.locator(selector).count()
        if count > 0:
            print("Found.")
            return
        page.wait_for_timeout(POLLING_INTERVAL)

    raise TimeoutError(f"Timed out waiting for {selector}")


def get_select_container(page, selector: str):
    select = page.locator(selector)
    count = select.count()
    assert count == 1, f"Expected one element for {selector}, got {count}"

    return select.locator(
        "xpath=ancestor::*[contains(@class, 'form-group') or contains(@class, 'shiny-input-container')][1]"
    )


def open_dropdown(page, selector: str):
    container = get_select_container(page, selector)

    print(f"Opening dropdown for {selector}")
    container.locator(".selectize-input").click(force=True)
    page.wait_for_timeout(500)

    return container


def dropdown_content_locator(page, container):
    local = container.locator(".selectize-dropdown-content")

    if local.count() > 0:
        return local.first

    print("  No dropdown content inside container; using global visible dropdown fallback")
    return page.locator(".selectize-dropdown:visible .selectize-dropdown-content").first


def option_items_from_dropdown(dropdown_content):
    # Use direct children of .selectize-dropdown-content
    return dropdown_content.locator(":scope > div")


def get_select_options(page, selector: str):
    container = open_dropdown(page, selector)
    dropdown_content = dropdown_content_locator(page, container)
    options = option_items_from_dropdown(dropdown_content)

    count = options.count()
    print(f"  Found {count} options for {selector}")

    values = []
    for i in range(count):
        opt = options.nth(i)

        text = opt.inner_text().strip()
        value = opt.get_attribute("data-value")

        print(f"    option {i}: text={text!r}, value={value!r}")

        if text or value:
            values.append({"text": text, "value": value})

    page.keyboard.press("Escape")
    page.wait_for_timeout(300)

    return values


def css_escape_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def select_by_value(page, selector: str, value: str, label: str | None = None):
    print(f"Selecting {selector}: {label or value}")

    container = open_dropdown(page, selector)
    dropdown_content = dropdown_content_locator(page, container)

    safe_value = css_escape_value(value)
    option = dropdown_content.locator(f":scope > div[data-value='{safe_value}']")
    option.first.click(force=True)

    page.wait_for_timeout(3000)
    page.keyboard.press("Escape")


def download_single_file(page, output_dir_path: Path):
    print(f"Downloading to {output_dir_path}")

    try:
        with page.expect_download(timeout=60_000) as download_info:
            page.locator(DOWNLOAD_ID).click(force=True)

        download = download_info.value
        download.save_as(output_dir_path)
        print(f"Saved: {output_dir_path}")

    except PlaywrightTimeoutError:
        print(f"Download timed out for {output_dir_path}")

    except Exception as e:
        print(f"Download failed for {output_dir_path}")
        print(repr(e))


def main(p, output_dir_path: Path):
    print("Launching browser...")
    browser = p.chromium.launch(headless=False, channel="chrome")
    page = browser.new_page(accept_downloads=True)

    print(f"Navigating to {URL}")
    page.goto(URL, wait_until="domcontentloaded", timeout=120_000)

    print("Giving Shiny time to initialize...")
    page.wait_for_timeout(10_000)

    wait_for_present(page, SELECT_YEAR_ID)
    wait_for_present(page, SELECT_INFECTION_ID)
    wait_for_present(page, SELECT_PATHOGEN_ID)
    wait_for_present(page, DOWNLOAD_ID)

    year_options = get_select_options(page, SELECT_YEAR_ID)
    print("Available years:", [x["text"] for x in year_options])

    for year in year_options:
        select_by_value(page, SELECT_YEAR_ID, year["value"], year["text"])

        infection_options = get_select_options(page, SELECT_INFECTION_ID)
        print("Available infections:", [x["text"] for x in infection_options])

        for infection in infection_options:
            print("\n" + "=" * 80)
            print(f"Infection: {infection['text']}")

            select_by_value(page, SELECT_INFECTION_ID, infection["value"], infection["text"])

            print("Waiting for pathogen list to update...")
            page.wait_for_timeout(5000)

            pathogen_options = get_select_options(page, SELECT_PATHOGEN_ID)
            print("Available pathogens:", [x["text"] for x in pathogen_options])

            if not pathogen_options:
                print(f"No pathogens found for infection {infection['text']}; skipping.")
                continue

            for pathogen in pathogen_options:
                print("-" * 80)
                print(f"Pathogen: {pathogen['text']}")

                select_by_value(page, SELECT_PATHOGEN_ID, pathogen["value"], pathogen["text"])

                page.wait_for_timeout(3000)

                filename = f"{escape_filename(year['text'])}_{escape_filename(infection['text'])}_{escape_filename(pathogen['text'])}.csv"
                download_single_file(page, output_dir_path / filename)

    print("Done.")
    browser.close()

def download_raw_dataset(output_dir_path: Path):
    output_dir_path.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        main(p, output_dir_path)

if __name__ == "__main__":
    download_raw_dataset(constants.DOWNLOAD_DIR_PATH)