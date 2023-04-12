from time import sleep # this should go at the top of the file
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options 
from selenium.webdriver.common.by import By
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

def generate_golden_tests(url):
    #Set up webdriver
    chrome_options = Options()
    chrome_options.headless = True
    driver = webdriver.Chrome(options=chrome_options)
    driver.get(url)
    sleep(5)

    #define directory paths
    dirname = os.path.dirname(__file__)
    test_case_dir = dirname+'\\case'
    result_dir = dirname+'\\result'

    for filename in os.listdir(test_case_dir):
        test_code = read_test_case(test_case_dir,filename)
        run_test(test_code,driver,result_dir,filename)

def read_test_case(dir,filename):
    file_path_case = os.path.join(dir, filename)
    if os.path.isfile(file_path_case):
        with open(file_path_case, 'r') as case_file:
            test_code = case_file.read()
    return test_code

def run_test(test_code,web_driver,dir,filename):
    file_path_result = os.path.join(dir, filename)
    test_command = "test_l(`%s`)"%test_code
    web_driver.execute_script(test_command)
    results = web_driver.find_element(By.CLASS_NAME, "results")

    with open(file_path_result, 'w') as result_file:
        result_file.write(results.find_element(By.ID,"registers").text+"\n")
        result_file.write(results.find_element(By.ID, "memory").text+"\n")
        result_file.write(web_driver.find_element(By.ID, "prettyPretty").text)

generate_golden_tests('http://127.0.0.1:5501/index.html')