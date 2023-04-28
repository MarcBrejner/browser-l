var registerDiv = document.getElementById("registers");
var labelsDiv = document.getElementById("labels");
var constantsDiv = document.getElementById("constants");
var dataDiv = document.getElementById("data");
var memoryDiv = document.getElementById("memory");
var outputSpan = document.getElementById("output");

var _VirtualMachine = null;
var _PrettyPrinter = null;

// Editable window
var codeMirrorEditor =
    CodeMirror.fromTextArea(document.getElementById('editorWindow'), {
      lineNumbers : true,
      value : "",
    })

// Fires whenever the editable window changes
codeMirrorEditor.on('change', async function(cMirror) {
  var source_code = cMirror.getValue();
  //  Set content of prettyWindow to the pretty printed code
  var code = await parse_and_pretty_print(source_code);
  document.getElementById("prettyPretty").innerHTML = code;
});

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
  
  let tree_L0 = emit_down(source_code, emit_functions, parsers, 2);
  let program = compile(tree_L0);
  // parse_byte_code from pretty.js pretty prints the byte_code
  var pretty_printer = get_pretty_printer(program);
  return pretty_printer.print_program();
}

async function parse_and_read(source_code) {
  var parsers = await initialize_parser();
  let tree_L0 = emit_down(source_code, emit_functions, parsers, 2);
  let program = compile(tree_L0);
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
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  if(program.error_msg !== null){
    console.log(program.error_msg);
    return;
  }
  var VM = get_virtual_machine(program);
  show_results_in_html(VM.state);
  document.querySelector('#debugbutton').disabled = true;
  document.querySelector('#exitdebug').disabled = false;
  document.querySelector('#stepbutton').disabled = false;
}

async function exit_debug() {
  reset_buttons_after_debug();
  var pretty_printer = get_pretty_printer();
  document.getElementById("prettyPretty").innerHTML = pretty_printer.print_program();
  var source_code = await codeMirrorEditor.getValue();
  var program = await parse_and_read(source_code);
  var VM = get_virtual_machine(program);
  show_results_in_html(VM.state);
}

function execute_all() {
  while (true) { // step
    if (execute_step() == -1) {
      break;
    }
  }
}

function execute_step() {
  var VM = get_virtual_machine();
  if (VM.state.registers['$!'] >= VM.program.instructions.length) {
    console.log("EOF");
    return -1;
  }

  VM.execute_bytecode();

  var pretty_printer = get_pretty_printer(VM.program);
  document.getElementById("prettyPretty").innerHTML = pretty_printer.print_program(VM.state);
  show_results_in_html(VM.state);
}

function show_results_in_html(state) {
  registerDiv.innerHTML = "Registers: " + JSON.stringify(state.registers, undefined, 2).replaceAll("\"", "");
  var rows = ""
  var rowText = "";
  for (var i = 0; i < state.memory.length; i += 16) {
    rowText = "";
    var row = `<td>${i.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})}--</td>`
    for (var j = i; j < state.memory.length && j < i + 16; j += 1) {
      row += `<td>${state.memory[j]}</td>`
    }
    for (var k = i; k < state.memory.length && k < i + 16; k += 1) {
      if (state.memory[k] === '00') {
        rowText += " ";
      } else {
        rowText += `${String.fromCharCode(parseInt(state.memory[k],16))}`
      }
    }
    row += `<td>|   ${rowText}</td>`
    rows += `<tr>${row}</tr>`
  }
  memoryDiv.innerHTML = `<table>${rows}</table>`
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

function get_pretty_printer(program) {
  if (_PrettyPrinter == null) {
    _PrettyPrinter = new PrettyPrinter();
    _PrettyPrinter.update_program(program);
    return _PrettyPrinter;
  }

  if (program === undefined) {
    return _PrettyPrinter;
  }

  _PrettyPrinter.update_program(program)
  return _PrettyPrinter;
}

function reset_buttons_after_debug() {
    document.querySelector('#debugbutton').disabled = false;
    document.querySelector('#exitdebug').disabled = true;
    document.querySelector('#stepbutton').disabled = true;
    if (document.querySelector('.highlight-line') != null) {
      document.querySelector('.highlight-line').classList.remove('highlight-line');
    }
    outputSpan.innerHTML = '';
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