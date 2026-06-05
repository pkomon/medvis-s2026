# MedVis Project: Interactive AMR dashboard

Web-based interactive dashboard that allows exploring the [WHO GLASS AMR dataset](https://worldhealthorg.shinyapps.io/glass-dashboard/_w_e19c46655b554cd08873fd015059a57f/_w_38e038c0b4964b3199d40fdcb242e668/#!/amr).

This project aims to visualize the global state of antimicrobial resistance (AMR), allowing professionals to explore the resistance of pathogens to various antibiotics according to large scale empirical tests. Further, it enables the comparison of AMR between regions as well as over time.

A demo is available **[here](https://pkomon.github.io/medvis-s2026/visualization/)**.

## Acquisition and preprocessing
The raw datasets can be downloaded from the WHO portal using a Python script and are merged into a single CSV file.
Since the data is available for download only for the (filtered) views on the WHO GLASS dashboard, a little web scraping is necessary to fetch the full dataset.

For convenience, we include the processed dataset in this repository (`./dataset/glass_amr.csv`) already.
If you want to fetch the dataset and preprocess it locally, follow the instructions below.

To setup the Python environment, run
1. Navigate to `preprocessing` folder
   ```
   cd /path-to-repo/preprocess
   ```
1. Install new virtual environment
   ```
   python -m venv ./venv
   ```
1. Activate virtual environment
   ```
   ./venv/Scripts/activate
   ```
1. Install dependencies
   ```
   pip install -r requirements.txt
   ```
1. Install browser binaries for using scraping
   ```
   python -m playwright install chromium
   ```

Finally, download and process the dataset by running (still in the `processing` folder with activated virtual environment)
   ```
   python ./all.py
   ```

This creates a folder `./dataset/glass_downloads` in the repository root directory as well as the processed dataset `./dataset/glass_amr.csv`.
