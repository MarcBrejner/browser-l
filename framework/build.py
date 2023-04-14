import base64
import os
import shutil
from zipfile import ZipFile

import docker
import requests


def compile_wasm():
    image_tag="from-py"
    client = docker.from_env()
    client.images.build(path="./", tag=image_tag, rm=True)
    container = client.containers.create(image_tag)
    container_id = container.id
    os.makedirs("./temp/tree-sitter", exist_ok=True)
    os.system("docker cp {}:/tree-sitter-L0.wasm ./temp/tree-sitter-l0.wasm".format(container_id))
    os.system("docker cp {}:/tree-sitter-twenty/lib/binding_web/tree-sitter.js ./temp/tree-sitter/tree-sitter.js".format(container_id))
    container.remove()

def encode_wasm():
    with open("./temp/tree-sitter-l0.wasm","rb") as wasm_file:
        encoded = base64.b64encode(wasm_file.read())
        encoded_l = encoded.decode('utf-8')

    code = """function asciiToBinary(str) {
        return atob(str)
    }

    function decode(encoded) {
    var binaryString =  asciiToBinary(encoded);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
    }
    """
    code += "encoded = '{}'; \nvar L_wasm = decode(encoded);".format(encoded_l)
    with open("temp/loadparser.js", "w") as output_file:
        output_file.write(code)

def bundle_html():
    os.chdir('../')
    output_bundled = open("framework/out/bundled.html", "w")
    html_template = open("index.html","r")

    for line in html_template:
        line_to_append = line   
        if "<script" in line and "src" in line:
            source_file_path = line.split("src=")[1].split(">")[0].replace('"','')
            if source_file_path.startswith("dev"):
                source_file_path = source_file_path.replace("dev/assets/", "framework/temp/")
            with open(source_file_path, 'r') as source_file:
                code = source_file.read()
                line_to_append = "<script>"+code+"</script>"
        elif "<link href" in line and "rel" in line:
            source_file_path = line.split('href="')[1].split('"')[0]
            if source_file_path.startswith("dev"):
                source_file_path = source_file_path.replace("dev/assets/", "framework/temp/")
            with open(source_file_path, 'r') as source_file:
                code = source_file.read()
                line_to_append = "<style>"+code+"</style>"
        output_bundled.write(line_to_append)

    output_bundled.close()
    html_template.close()
    
def download_codemirror():
    codemirror_path = "./temp/codemirror"
    os.makedirs(codemirror_path, exist_ok=True)
    response = requests.get("https://codemirror.net/5/codemirror.zip")

    with open(codemirror_path + '/codemirror.zip', 'wb') as zipFile:
        zipFile.write(response.content)

    with ZipFile(codemirror_path + '/codemirror.zip', 'r') as zip_ref:
        zip_ref.extractall(path=codemirror_path)

    shutil.move(codemirror_path + "/codemirror-5.65.12/lib/codemirror.css", codemirror_path + "/codemirror.css")
    shutil.move(codemirror_path + "/codemirror-5.65.12/lib/codemirror.js", codemirror_path + "/codemirror.js")

def delete_codemirror():
    os.chdir('./framework')
    shutil.rmtree('./temp/codemirror')
    shutil.rmtree('./temp/tree-sitter')
    os.remove("./temp/tree-sitter-l0.wasm")
    os.remove("./temp/loadparser.js")
    os.rmdir('./temp')



compile_wasm()
encode_wasm()
download_codemirror()
bundle_html()
delete_codemirror()