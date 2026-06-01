from pathlib import Path
from download import download_raw_dataset
from merge import read_and_concat_files
import constants

if __name__ == "__main__":
    download_raw_dataset(constants.DOWNLOAD_DIR_PATH)
    read_and_concat_files(constants.DOWNLOAD_DIR_PATH, constants.OUTPUT_FILE_PATH)
