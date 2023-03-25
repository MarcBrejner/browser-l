var registerDiv = document.getElementById("registers");
var labelsDiv = document.getElementById("labels");
var constantsDiv = document.getElementById("constants");
var dataDiv = document.getElementById("data");
var memoryDiv = document.getElementById("memory");


//Editable window
var codeMirrorEditor = CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
    lineNumbers: true,
    value: "",
})

//Non editable display window
var codeMirrorPretty = CodeMirror.fromTextArea(document.getElementById('prettyWindow'), {
    lineNumbers: true,
    value: "",
    readOnly: true
})

//Fires whenever the editable window changes
codeMirrorEditor.on('change',async function(cMirror){
    var source_code = cMirror.getValue();
    codeMirrorPretty.setValue(await parse_and_pretty_print(source_code));
});

//Load parser
const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  const parser = new Parser();
  const L = await Parser.Language.load(L_wasm);
  parser.setLanguage(L);
  return parser;
}

//Pretty print input sourcecode
async function parse_and_pretty_print(source_code){
    let parser = await initialize_parser();
    let tree = await parser.parse(source_code);
    if(tree.rootNode.toString().includes("ERROR")){
        return "";
    }
    let program = read_program(tree);
    // parse_byte_code from pretty.js pretty prints the byte_code
    return parse_byte_code(program);
}

async function parse_and_read(source_code){
    let parser = await initialize_parser();
    let compiled_L0_code = await parse_and_pretty_print(source_code);
    let tree = await parser.parse(compiled_L0_code);
    //p_source from pretty.js pretty prints the code using the input parse tree
    return read_program(tree);
}
async function run_all(){
    var source_code = await codeMirrorEditor.getValue();

    let program = await parse_and_read(source_code);
    console.log(program)
    //execute_all(state, program);
}

async function pauseUntilEvent (clickListenerPromise) {
    await clickListenerPromise
  }


async function createClickListenerPromise (target) {
    return new Promise((resolve) => target.addEventListener('click', resolve))
}

async function debug(){
    document.querySelector('#debugbutton').disabled = true;
    document.querySelector('#stepbutton').disabled = false;
    var source_code = await codeMirrorEditor.getValue();
    let program = await parse_and_read(source_code);

    while(true){
        await pauseUntilEvent(createClickListenerPromise(document.querySelector('#stepbutton')))
        if(execute_step(state, program) == -1){
            document.querySelector('#debugbutton').disabled = false;
            document.querySelector('#stepbutton').disabled = true;
            return;
        }
    }
}

function execute_all(state, program){
    while(true){ //step
        if (execute_step(state, program) == -1) {
            break;
        }
    }
}

function execute_step(state, program){
    if(state.registers['$!'] >= program.length){
        console.log("EOF");
        return -1;
    }
    execute_bytecode(program[state.registers['$!']])
    state.registers['$!']++;
    
    registerDiv.innerHTML = "Registers: " + JSON.stringify(state.registers, undefined, 2).replaceAll("\"", "");
    labelsDiv.innerHTML = "Labels: " + JSON.stringify(state.labels, undefined, 2).replaceAll("\"", "");
    constantsDiv.innerHTML = "Constants: " + JSON.stringify(state.cs, undefined, 2).replaceAll("\"", "");
    dataDiv.innerHTML = "Data: " + JSON.stringify(state.data, undefined, 2).replaceAll("\"", "");
    //memoryDiv.innerHTML = "memory: " + JSON.stringify(state.memory, undefined, 2);
}
