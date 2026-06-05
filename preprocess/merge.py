import pandas as pd
import os
from pathlib import Path
import re

import constants

# helper for unicode code-point replacement was generated using LLM, manually adapted
pattern = re.compile(r"<U\+([0-9A-Fa-f]+)>")

def decode_unicode_markers(value):
    if isinstance(value, str):
        return pattern.sub(
            lambda m: chr(int(m.group(1), 16)),
            value
        )
    return value

def read_and_concat_files(input_dir_path: Path, output_file_path: Path) -> pd.DataFrame:
    file_paths = [input_dir_path / path for path in os.listdir(input_dir_path) if os.path.isfile(input_dir_path / path)]

    merged_df = pd.DataFrame()

    for file_path in file_paths:
        print(f"Process {file_path}...")
        with open(file_path, "rt", encoding="utf-8") as file:
            assert file_path.name.endswith(".csv"), f"Unexpected file in download folder: {file_path}"

            # skip all lines until actual data
            while file.readline().strip() != "Data for boxplots":
                pass

            # parse csv
            df = pd.read_csv(file)
            df = df.map(decode_unicode_markers)

            # add year column
            year = file_path.name.split("_")[0]
            df.insert(0, "Year", year)

            # use consistent infection name and antibiotics names
            df["Specimen"] = df["Specimen"].replace("BLOOD", "Bloodstream")
            df["AntibioticName"] = df["AntibioticName"].str.replace("resistance", "")
            df["AntibioticName"] = df["AntibioticName"].str.replace("Third generation", "3rd-gen.")


            # merge
            if merged_df.empty:
                merged_df = pd.concat([df])
            else:
                merged_df = pd.concat([df, merged_df])

    print("Writing output file...")
    # use ";"" as separator because some country names include "," and that way we avoid quoting
    merged_df.to_csv(output_file_path, index=False, sep=";", lineterminator="\n", encoding="utf-8-sig")
    print("Done.")

if __name__ == "__main__":
    read_and_concat_files(constants.DOWNLOAD_DIR_PATH, constants.OUTPUT_FILE_PATH)
