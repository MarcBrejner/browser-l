import base64
import os
import shutil
from zipfile import ZipFile

import docker
import requests


def create_docker():
    global container
    image_tag="from-py"
    client = docker.from_env()
    client.images.build(path="./", tag=image_tag, rm=True)
    print("Created image")
    container = client.containers.create(image_tag)
    print("Created container")

def compile_tree_sitter():
    os.makedirs("./temp/tree-sitter", exist_ok=True)
    os.system("docker cp {}:/tree-sitter-twenty/lib/binding_web/tree-sitter.js ./temp/tree-sitter/tree-sitter.js".format(container.id))
    print("Copied tree-sitter.js")

def compile_L_level(level):
    os.makedirs("./temp/tree-sitter", exist_ok=True)
    os.system("docker cp {}:/tree-sitter-L{}.wasm ./temp/tree-sitter-l{}.wasm".format(container.id, level, level))
    print("Copied tree-sitter-l{}.wasm".format(level))


def encode_wasm():
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

var encoded_levels = new Array();
"""
    #define directory paths
    for filename in os.listdir('levels'):
        level = filename.replace('L', '')
        with open("levels/{}/compiler-module.js".format(filename),"r") as emit_function:
            code+= "{}\n".format(emit_function.read())
        compile_L_level(level)
        with open("./temp/tree-sitter-l{}.wasm".format(level),"rb") as wasm_file:
            encoded = base64.b64encode(wasm_file.read())
            encoded_l = encoded.decode('utf-8')
        code += "encoded_levels.push(decode('{}'));\n".format(encoded_l)
    
    code += """for (var i = 0; i < encoded_levels.length; i++){
    var opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = "L"+i;
    document.getElementById('levels').appendChild(opt);
}
document.getElementById('levels').value = 4;\n\n"""

    code += """function get_visitor(level) {
  switch (level) {"""
    for filename in os.listdir('levels'):
        level = filename.replace('L', '')
        code += """
        case {}:
            return new {}Visitor();""".format(level, filename)
    code += "\n}\n}\n"
    
    code += """function get_drawer(level) {
  switch (level) {"""
    for filename in os.listdir('levels'):
        level = filename.replace('L', '')
        code += """
        case {}:
            return new {}Draw();""".format(level, filename)
    code += "\n}\n}\n"
    
    code += """function get_emitter(level) {
  switch (level) {"""
    for filename in os.listdir('levels'):
        level = filename.replace('L', '')
        code += """
        case {}:
            return new {}Emitter();""".format(level, filename)
    code += "\n}\n}"


    


    with open("temp/loadparser.js", "w") as output_file:
        output_file.write(code)

    print("Encoded wasm")
    with open("../dev/assets/loadparser.js", "w") as output_file:
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
    print("Bundled html")
    
def download_codemirror():
    codemirror_path = "./temp/codemirror"
    os.makedirs(codemirror_path, exist_ok=True)
    response = requests.get("https://codemirror.net/5/codemirror.zip")

    with open(codemirror_path + '/codemirror.zip', 'wb') as zipFile:
        zipFile.write(response.content)

    with ZipFile(codemirror_path + '/codemirror.zip', 'r') as zip_ref:
        zip_ref.extractall(path=codemirror_path)

    shutil.move(codemirror_path + "/codemirror-5.65.13/lib/codemirror.css", codemirror_path + "/codemirror.css")
    shutil.move(codemirror_path + "/codemirror-5.65.13/lib/codemirror.js", codemirror_path + "/codemirror.js")

def delete_codemirror():
    os.chdir('./framework')
    shutil.rmtree('./temp/codemirror')
    shutil.rmtree('./temp/tree-sitter')
    for filename in os.listdir('levels'):
        level = filename.replace('L', '')
        os.remove("./temp/tree-sitter-l{}.wasm".format(level))
    os.remove("./temp/loadparser.js")
    os.rmdir('./temp')

create_docker()
compile_tree_sitter()
encode_wasm()
download_codemirror()
bundle_html()
delete_codemirror()
container.remove()