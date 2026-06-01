import pandas as pd
import os
from pathlib import Path
import constants

def read_and_concat_files(input_dir_path: Path, output_file_path: Path) -> pd.DataFrame:
    file_paths = [input_dir_path / path for path in os.listdir(input_dir_path) if os.path.isfile(input_dir_path / path)]

    merged_df = pd.DataFrame()

    for file_path in file_paths:
        print(f"process {file_path}...")
        with open(file_path, "rt", encoding="utf-8") as file:
            # skip all lines until actual data
            while file.readline().strip() != "Data for boxplots":
                pass

            df = pd.read_csv(file)
            if merged_df.empty:
                merged_df = pd.concat([df])
            else:
                merged_df = pd.concat([merged_df, df])
    print("writing output file...")
    df.to_csv(output_file_path, index=False, lineterminator='\n')
    print("done.")

if __name__ == "__main__":
    read_and_concat_files(constants.DOWNLOAD_DIR_PATH, constants.OUTPUT_FILE_PATH)
