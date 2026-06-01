# Notes on preprocessing:

## Dataset
- https://worldhealthorg.shinyapps.io/glass-dashboard/_w_e19c46655b554cd08873fd015059a57f/_w_38e038c0b4964b3199d40fdcb242e668/#!/amr
- anti-microbal resistance data
- Tabular data
  - Year
  - Country
  - Pathogen (Bacteria)
  - Antibiotic
  - Total number of performed tests and number of positive tests

## Acquisition
- the **full** raw dataset can not be downloaded directly
- the WHO offers the [GHO OData API](https://www.who.int/data/gho/info/gho-odata-api), but the data we need is not provided through it
- the WHO publishes extensive PDF reports on AMR yearly, however, the raw dataset is again not contained within it
- the data for the visualizations in the GLASS dashboard can be downloaded directly
  - the box plots (section "Resistance to antibiotics in the selected calendar year") contains the data we want
  - however, when downloading, we only get the data for the currently set filter, selecting all is not possible
  - upon inspection using the dev tools, there does not seems to an API for retrieving that data
  - possible solution: scrape the data with a script (need to iterate all combinations of years and pathogens)
  - possible solution: do manually; there are only 33 combinations that need to be downloaded - its annoying, but probably is faster than writing a script
  - try: write a script with help of ChatGPT
  - success: wrote script for scraping by inspecting the UI and using ChatGPT, manually adapted
  - success: wrote script for merging the dataset into a single csv file (wrote manually)