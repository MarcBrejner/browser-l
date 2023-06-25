var registerDiv = document.getElementById("registers");
var labelsDiv = document.getElementById("labels");
var constantsDiv = document.getElementById("constants");
var dataDiv = document.getElementById("data");
var memoryDiv = document.getElementById("memory");
var outputSpan = document.getElementById("output");
var chosenLevel = document.getElementById("levels");

var _VirtualMachine = null;
var _PrettyPrinter = null;

// Editable window
var codeMirrorEditor =
    CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
      lineNumbers : true,
      value : "",
    })

chosenLevel.onchange = function(){
  CodeMirror.signal(codeMirrorEditor,'change', codeMirrorEditor)
}

// Fires whenever the editable window changes
codeMirrorEditor.on('change', async function(cMirror) {
  var source_code = cMirror.getValue();
  //  Set content of prettyWindow to the pretty printed code
  await parse_and_pretty_print(source_code);

  //Fixes a bug with codemirror where added line classes persists too long
  clear_highlights();
})

// Load parser
const Parser = window.TreeSitter;
async function initialize_parser() {
  await Parser.init();
  var parsers = new Array();
  for (var i = 0; i < encoded_levels.length; i++) {
    let parser = new Parser();
    let L = await Parser.Language.load(encoded_levels[i]);
    parser.setLanguage(L);
    parsers.push(parser);
  }
  return parsers;
}

// Pretty print input sourcecode
async function parse_and_pretty_print(source_code) {
  let parsers = await initialize_parser();
  let AST = parsers[chosenLevel.value].parse(source_code);
  let program = BuildSystem(AST);
  var VM = get_virtual_machine(program);
  draw(VM);
}

async function parse_and_read(source_code) {
  var parsers = await initialize_parser();
  let AST = parsers[chosenLevel.value].parse(source_code);
  let program = BuildSystem(AST);
  return program;
}

async function run_all() {
  outputSpan.innerHTML = '';
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  console.log(program)
  // updates the program of the virtual machine
  get_virtual_machine(program);
  reset_buttons_after_debug();
  execute_all();
}

async function debug() {
  outputSpan.innerHTML = '';
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  document.querySelector('#debugbutton').disabled = true;
  document.querySelector('#exitdebug').disabled = false;
  document.querySelector('#stepbutton').disabled = false;

  var VM = get_virtual_machine(program);
  draw(VM)
}

async function exit_debug() {
  reset_buttons_after_debug();
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  var VM = get_virtual_machine(program);
  draw(VM)
}

function execute_all() {
  while (true) { // step
    if (execute_step(false) == -1) {
      break;
    }
  }
}

function draw(VM){
  VM.program.drawer.draw(VM);
}

function execute_step(debugging = true) {
  var VM = get_virtual_machine();
  VM.execute_bytecode();

  if (VM.state.registers['$!'] >= VM.program.instructions.length) {
    console.log("EOF");
    draw(VM)
    reset_buttons_after_debug()
    return -1;
  }
  if(debugging){
    draw(VM)
  }
}



function get_virtual_machine(program) {
  if (_VirtualMachine == null) {
    _VirtualMachine = new VirtualMachine();
    _VirtualMachine.update_vm(program);
    return _VirtualMachine;
  }

  if (program === undefined) {
    return _VirtualMachine;
  }

  _VirtualMachine.update_vm(program)
  return _VirtualMachine;
}

function reset_buttons_after_debug() {
    document.querySelector('#debugbutton').disabled = false;
    document.querySelector('#exitdebug').disabled = true;
    document.querySelector('#stepbutton').disabled = true;
    if (document.querySelector('.highlight-line') != null) {
      var element = document.querySelector('.highlight-line');
      element.classList.remove('highlight-line');
    }
}

async function test_l(source_code){
  var program = await parse_and_read(source_code);
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  get_virtual_machine(program);
  execute_all();
}

function getKeyByValueIfValueExists(object, value) {
  if(Object.values(object).includes(value)){
    return [true, Object.keys(object).find(key => object[key] === value)];
  }else{
    return [false, null];
  }
}


function clear_highlights(){
  const marks = codeMirrorEditor.getAllMarks();
  marks.forEach(mark => {
    mark.clear();
  });
}