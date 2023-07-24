function asciiToBinary(str) {
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
class L0Visitor {
    visit(node) {
        this._emitter.node_stack.push(node);
        if (this[node.type] === undefined) {
            var r = this.default(node);
            this._emitter.node_stack.pop();
            return r;
        } else {
            var r = this[node.type](node);
            this._emitter.node_stack.pop();
            return r;
        }
    }

    default(node) {
        if (node.childCount == 1) {
            return this.visit(node.child(0));
        } else {
            node.children.forEach(c => { this.visit(c) });
        }
    }

    comment(node) {
        return;
    }

    expression(node) {  
        switch (node.childCount) {
            case 1:
                var reader = this.visit(get_left_child(node));
                return this._emitter.expression(reader)
            case 2:
                var oper = get_operator(node).text;
                var reader =  this.visit(get_left_child(node));
                return this._emitter.unary_expression(oper, reader)
            case 3:
                var left_reader = this.visit(get_left_child(node));
                var oper = get_operator(node).text;
                var right_reader = this.visit(get_right_child(node));
                return this._emitter.binary_expression(left_reader, oper, right_reader);
        }
    }

    memory_expression(node) {
        return this.expression(node);
    }

    number(node) {
        var number = parseInt(node.text);
        return this._emitter.number(number);
    }

    constant(node) {
        var constant_id = node.text;
        return this._emitter.constant(constant_id);
    }

    data(node) {
        var data_id = node.text;
        return this._emitter.data(data_id);
    }

    register(node) {
        var register_id = node.text;
        return this._emitter.register(register_id);
    }

    memory(node) {
        var memory_id = this.visit(node.child(1));
        var datatype = get_datatype(node.child(3).text);
        return this._emitter.memory(memory_id, datatype);
    }

    assignment(node) {
        var is_conditional = node.child(1).text === "?=" ? true : false;
        var has_not = node.child(2).text === '!' ? true : false;
        var writer = this.visit(node.child(0));
        var expression = null
        if (has_not) {
          var expression = this.visit(node.child(3));
        } else {
          var expression = this.visit(node.child(2));
        }
        this._emitter.assignment(writer, expression, is_conditional, has_not);
    }

    constant_declaration(node) {
        let constant_id = node.child(1).text;
        let value = node.child(2).text;
        this._emitter.constant_declaration(constant_id,value);
    }

    data_declaration(node) {
        let data_id = node.child(1).text;
        let value = node.child(2).text;
        this._emitter.data_declaration(data_id,value);
    }   

    label(node) {
        var label_id = node.text;
        if(node.parent.type === 'statements'){
            this._emitter.set_label(label_id);
        }else{
            return this._emitter.get_label(label_id);
        }
    }

    syscall(node) {
        this._emitter.syscall();
    }
}

class L0Emitter {
    _data = {};
    _const = {};
    _labels = {};
    _statements = [];

    expression(reader){
        return new Expression(CONTENT_TYPES.EXPRESSION, reader);
    }

    unary_expression(oper, reader){
        return new Expression(CONTENT_TYPES.UN_EXPRESSION, reader, oper);
    }

    binary_expression(left_reader, oper, right_reader){
        if (left_reader.type === CONTENT_TYPES.MEMORY && right_reader.type === CONTENT_TYPES.MEMORY) {
            this.assignment(this.register('$x'), left_reader);
            this.assignment(this.register('$y'), right_reader);
            left_reader = this.register('$x');
            right_reader = this.register('$y');
        }

        return new Expression(CONTENT_TYPES.BIN_EXPRESSION, left_reader, oper,  right_reader);
    }

    number(number) {
        return new Content(CONTENT_TYPES.NUMBER, number);
    }

    constant(constant_id) {
        return new Content(CONTENT_TYPES.CONSTANT, constant_id);
    }

    data(data_id) {
        return new Content(CONTENT_TYPES.DATA, data_id);
    }

    register(register_id) {
        return new Content(CONTENT_TYPES.REGISTER, register_id);
    }

    memory(memory_id, datatype) {
        return new Content(CONTENT_TYPES.MEMORY, memory_id, datatype);
    }

    constant_declaration(constant_id, constant_value) {
        this._const[constant_id] = constant_value;
    }

    data_declaration(data_id, data_value) {
        this._data[data_id] = data_value;
    }   

    set_label(label_id) {
        this._labels[label_id] = this._statements.length;
    }

    get_label(label_id) {
        return new Content(CONTENT_TYPES.LABEL, label_id);
    }

    syscall() {
        this.push_statement(new ByteCode(OP.SYSCALL));
    }


    assignment(writer, expression, is_conditional=false, has_not=false) {
        this.push_statement(new ByteCode(get_opcode(expression), [is_conditional, has_not, writer].concat(convert_content_to_array(expression))));
    }

    push_statement(byte_code) {
        this._statements.push(byte_code);
        this._drawer.node_ECS.push(this.node_stack.peek());
    }

    node_stack = {
        stack: [],
    
        push(node) {
            this.stack.push(node);
        },
    
        pop() {
            if (this.stack.length == 0)
                return "Underflow";
            return this.stack.pop();
        },
    
        peek(){
            return this.stack[this.stack.length-1];
        }
    };
}

class L0Draw {
    constructor(){
        this.node_ECS = new Array();
    }

    draw(vm){
        this.pretty_print(vm);
        this.color(vm);
        this.show_results(vm.state)
    }

    pretty_print(vm) {
        this.program = vm.program;
        this.state = vm.state;
        var pretty_window = document.getElementById("prettyPretty");

        if(this.program.error_msg !== null){
          pretty_window.innerHTML = this.program.error_msg;
          return;
        }

        var pretty_source_code = "";
        var instructions = this.program.instructions;

        var debugging = document.querySelector('#debugbutton').disabled;
        for (var i = 0; i < instructions.length; i++) {
          var res = `<span id=line-number>${i} </span>` + instructions[i].handle(this) + this.print_labels(i) +`<br>`;
          if (!debugging || this.state === undefined) {
            pretty_source_code += res;
          } else {
            if (i === this.state.registers['$!']) {
              pretty_source_code +=
                  `<span class=highlight-line>${res}</span>`
            } else {
              pretty_source_code += res
            }
          }
        }
        var result = this.get_labels_after_statements(instructions.length);
        var unique_result = [...new Set(result)]
        var res = ""
        unique_result.forEach(label => {
          res = `<span id=line-number>${label}</span> ` + this.print_labels(label) +`<br>`;
          if (!debugging || this.state === undefined) {
            pretty_source_code += res;
          } else {
            if (label === this.state.registers['$!']) {
              pretty_source_code +=
                  `<span class=highlight-line>${res}</span>`
            } else {
              pretty_source_code += res
            }
          }
        })
        
        pretty_window.innerHTML = pretty_source_code;
      }

      get_labels_after_statements(last_instruction_index) {
        var result = Object.values(this.program.labels).filter(value => value >= last_instruction_index);
        return result; 
      }
    
      syscall() { return `<span style='color: red'>syscall;</span>\n` }
    
      assign_binary(conditional, has_not, writer, reader1, opr, reader2) {
        var cond = conditional ? '?=' : ':=';
        var not = "";
        if (has_not) {
          not = this.wrap_not();
        }
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${not} ${this.wrap_assign(this.print_content(reader1))} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader2))}${this.wrap_semicolon()}\n`
      }
    
      assign_unary(conditional, has_not, writer, opr, reader) {
        var cond = conditional ? '?=' : ':=';
        var not = "";
        if (has_not) {
          not = this.wrap_not();
        }
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${not} ${this.wrap_opr(opr)} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
      }
    
      assign(conditional, has_not, writer, reader) {
        var cond = conditional ? '?=' : ':=';
        var not = "";
        if (has_not) {
          not = this.wrap_not();
        }
        return `${this.wrap_assign(this.print_content(writer))} ${this.wrap_opr(cond)} ${not} ${this.wrap_assign(this.print_content(reader))}${this.wrap_semicolon()}\n`
      }
    
      wrap_assign(assign) {
        return `<span id=assign>${assign}</span>`;
      }
    
      wrap_opr(opr) {
        return `<span id=opr>${opr}</span>`;
      }
    
      wrap_semicolon() {
        return `<span id=semicolon>;</span>`;
      }
    
      wrap_const(constant) {
        return `<span id=constant>${constant}</span>`;
      }
    
      wrap_label(label) {
        return `<span id=label>${label}</span>`;
      }

      wrap_not() {
        return `<span id=not>!</span>`
      }
    
      print_content(content){
        if (content.type === CONTENT_TYPES.CONSTANT){
          return `${this.wrap_const(`${content.id} (${this.program.constants[content.id]})`)}`
        } else if (content.type == CONTENT_TYPES.LABEL) {
          return this.wrap_label(content.id);
        }else if(content.type == CONTENT_TYPES.MEMORY){
          return this.print_memory(content);
        }else{
          return `${content.id}`
        }
      }
    
      print_memory(content) {
        if (content.id.type === CONTENT_TYPES.BIN_EXPRESSION) {
          return `<span id=memory>[${content.id.reader1.get_text()} ${content.id.opr} ${content.id.reader2.get_text()},${content.datatype.type}${content.datatype.size}]</span>`
        }
        else {
          return `<span id=memory>[${content.get_text()},${content.datatype.type}${content.datatype.size}]</span>`
        }
      }
    
      print_labels(i){
        var labels = getKeyByValueIfValueExists(this.program.labels, i);
        if (labels.length === 0) return "";
        var result = "<span id=label>";
        labels.forEach(label => {
          result += `${label} `
        })
        result += "</span>";
        return result;
      }
      
      color(vm){
        var pc = vm.state.registers["$!"];
        if(pc >= vm.program.instructions.length){
            return;
        }
        clear_highlights()
        const start = {line: this.node_ECS[pc].startPosition.row , ch: this.node_ECS[pc].startPosition.column}
        const end = {line: this.node_ECS[pc].endPosition.row , ch: this.node_ECS[pc].endPosition.column}
        codeMirrorEditor.markText(start, end, { className: 'highlight-line' });
      }

      show_results(state) {
        
        registerDiv.innerHTML = "Registers: " + JSON.stringify(state.registers, undefined, 2).replaceAll("\"", "");
        var rows = ""
        var rowText = "";
        for (var i = 0; i < state.memory.length; i += 16) {
          rowText = "";
          // Print the actual memory
          var row = `<td>${i.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false})}--</td>`
          for (var j = i; j < state.memory.length && j < i + 16; j += 1) {
              row += `<td class='show-memory-id-on-hover' memory-id='${state.memory_id[j]}'>${state.memory[j]}</td>`
          }
          // Print the memory string representation to the right of each row
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
        memoryDiv.innerHTML = `<table id=memory-table>${rows}</table>`
      
        const tooltips = document.querySelectorAll(".show-memory-id-on-hover:not([memory-id=''])");
      
        tooltips.forEach(tooltip => {
          tooltip.addEventListener('mouseover', () => {
            const tooltipText = tooltip.getAttribute('memory-id');
            tooltips.forEach(el => {
              if (el.getAttribute('memory-id') === tooltipText) {
                el.classList.add('highlight-memory-id');
              }
            });
          });
      
          tooltip.addEventListener('mouseout', () => {
            tooltips.forEach(el => {
              el.classList.remove('highlight-memory-id');
            });
          });
        });
      } 
}
encoded_levels.push(decode('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AQARABcAAQAAAAcAAQAmABoAAQAkABsAAQAhACUAAQAdADAAAQAeAAoAGQABAAAAGwABAAkAHgABAA8AIQABABAAJAABABEABwABACYAGgABACQAGwABACEAJQABAB0AMAABAB4ABgAnAAEAAwAqAAEABAAIAAEAJQAsAAEAGQAnAAIAGgAbAC0ABAAJAA8AEAARAAQABwABAAkAFwABACQAMwABACAAEwAFAA0ADgAPABAAFAAEAAcAAQAJABcAAQAkAC8AAQAgABMABQANAA4ADwAQABQABwAHAAEACQALAAEAEAANAAEAEQAaAAEAJAAbAAEAIQAoAAEAHQAwAAEAHgAEABkAAQAAAC8AAQACADMAAQAWADEABAAJAA8AEAARAAQANQABAAAANwABAAIAOwABABYAOQAEAAkADwAQABEAAwAcAAEAIwAiAAEAIgA9AAQADQAOABAAFAADAD8AAQAAAEEAAQACAEMABAAJAA8AEAARAAMANQABAAAANwABAAIAOQAEAAkADwAQABEAAQBFAAYAAwAEAAkADwAQABEAAQBHAAUAAQAFAAYAEgATAAEAPwAFAAAACQAPABAAEQABADUABQAAAAkADwAQABEAAgArAAEAIwA9AAQADQAOABAAFAABAEkABQAAAAkADwAQABEAAQBLAAMAAQASABMAAgBNAAEAAQBPAAIAEgATAAIAUQABAAoAUwABABIAAQBVAAIABQAGAAEAVwACAAUABgACAFkAAQAKAFsAAQASAAEAXQABAAAAAQBfAAEAAQABAGEAAQABAAEAYwABAAEAAQBlAAEADAABAFkAAQAKAAEAZwABABUAAQBpAAEAFAABAGsAAQABAAEAbQABAAAAAQBvAAEAAQABAHEAAQABAAEAcwABAAIAAQB1AAEACwABAHcAAQAKAAEAeQABAAEAAQB7AAEAAAABAH0AAQABAAEAfwABAAEAAQCBAAEAAQABAIMAAQANAAEAhQABAA4AAQCHAAEAAQAAAAAAGgAAADEAAABQAAAAZwAAAIYAAAClAAAAvAAAAM0AAADeAAAA9AAAAAQBAAAUAQAAIQEAAC4BAAA7AQAARAEAAEwBAABUAQAAXAEAAGYBAABuAQAAdAEAAHwBAACDAQAAiAEAAI0BAACUAQAAmAEAAJwBAACgAQAApAEAAKgBAACsAQAAsAEAALQBAAC4AQAAvAEAAMABAADEAQAAyAEAAMwBAADQAQAA1AEAANgBAADcAQAA4AEAAOQBAADoAQAA7AEAAAAAAAAAAAAAAAEAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAAAAAAgAAAAIAAAAAEAAAAgAAAAIAAAAAAAAAAZAAAAAAAAAAAAAAABAAAAAAAAABkAAAAZAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAAAAAABwAAAAAAAAAAAAAACQALAA0AAAAAAAAAAAAAAC0ABAAsACcAJwAdACUAMAAAAAAAGwAAAAAAGgADAAYAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAAAAAAEBAAAAAAAAAAAxAAAAAAABAQAAAAAAAAAAMgAAAAAAAQEAAAAAAAAAAA4AAAAAAAEBAAAAAAAAAAALAAAAAAABAQAAAAAAAAAAGgAAAAAAAQEAAAAAAAAAADAAAAAAAAEBAAAAAAAAAAAFAAAAAAABAQAAAAAAAAAACgAAAAAAAQEAAAAAAAAAABcAAAAAAAEBAAAAAAAAAQEYAAAAAAABAQAAAAAAAAEBHAAAAAAAAQEAAAAAAAABAiYAAAAAAAIBAAAAAAAAAQImAAAAAAAAAA4AAAEAAAIBAAAAAAAAAQImAAAAAAAAAAsAAAEAAAIBAAAAAAAAAQImAAAAAAAAABoAAAEAAAIBAAAAAAAAAQImAAAAAAAAADAAAAEAAAIBAAAAAAAAAQIlAAAAAAAAADEAAAEAAAIBAAAAAAAAAQIlAAAAAAAAADIAAAEAAAEBAAAAAAAAAQIlAAAAAAABAQAAAAAAAAAAFAAAAAAAAQAAAAAAAAABAiYAAAAAAAEAAAAAAAAAAAAQAAAAAAABAQAAAAAAAAEDJgAAAAAAAQEAAAAAAAAAABMAAAAAAAEAAAAAAAAAAQMmAAAAAAABAAAAAAAAAAAADwAAAAAAAQEAAAAAAAAAABkAAAAAAAEBAAAAAAAAAQQmAAAAAAABAQAAAAAAAAAAFgAAAAAAAQAAAAAAAAABBCYAAAAAAAEBAAAAAAAAAQMlAAAAAAABAQAAAAAAAAEFJAAAAAAAAQEAAAAAAAABBSYAAAAAAAEBAAAAAAAAAQEgAAAAAAABAQAAAAAAAAEBHwAAAAAAAQEAAAAAAAAAAAkAAAAAAAEBAAAAAAAAAQEjAAAAAAABAAAAAAAAAAEBIwAAAAAAAQEAAAAAAAABASEAAAAAAAEBAAAAAAAAAAACAAAAAAABAQAAAAAAAAAAIQAAAAAAAQAAAAAAAAAAABUAAAAAAAEBAAAAAAAAAQEXAAAAAAABAQAAAAAAAAEDHgAAAAAAAQEAAAAAAAABAxoAAAAAAAEBAAAAAAAAAQMbAAAAAAABAQAAAAAAAAAAKgAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAAAfAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAABAhcAAAAAAAEBAAAAAAAAAQEZAAAAAAABAQAAAAAAAAAADQAAAAAAAQEAAAAAAAAAABEAAAAAAAEBAAAAAAAAAAASAAAAAAABAQAAAAAAAAEDIgAAAAAAAQEAAAAAAAAAACkAAAAAAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEEHgAAAAAAAQEAAAAAAAABAh8AAAAAAAEBAAAAAAAAAQEdAAAAAAABAQAAAAAAAAAAJAAAAAAAAQEAAAAAAAAAACMAAAAAAAEBAAAAAAAAAQMfAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABjb21tZW50AHN0YXRlbWVudABjb25zdGFudABzdGF0ZW1lbnRzAGRlY2xhcmF0aW9ucwBsb2dpY2FsX29wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAG1lbW9yeV9leHByZXNzaW9uAHN5c2NhbGwAbGFiZWwAc3RyaW5nAHR5cGUAc291cmNlX2ZpbGUAZW5kAGRhdGEAXQBbAD89ADo9ADsAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxAC0ALAAhAAoAAAAAAA0AAAAnAAAAAAAAABcAAAAAAAAANAAAAAIAAAABAAAAAAAAAAUAAABgBgAAAAAAAOADAAAABwAAAA0AAAAAAAAAAAAAAAAAALAEAAAwBQAAfgUAAIAFAACQBQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACcMAAA6DAAAagwAAE8LAAArDAAANwwAADQMAABoDAAAZAwAADIMAABmDAAAMAwAABYMAAByCwAAKwwAAAkMAACkCwAAAQwAAJsLAACTCwAAwgsAAA8MAABgCwAAGwwAAIYLAADjCwAAyQsAAN4LAAB7CwAAaAsAAFULAAD2CwAAuwsAAK0LAADvCwAAtAsAAEgLAABPDAAAPAwAAA=='));
class L1Visitor extends L0Visitor {  
    goto(node) {
        var reader = node.child(1);
        var pos = this.visit(reader);
        this._emitter.goto(pos)
    }
}

class L1Emitter extends L0Emitter{
    goto(pos, conditional=true){
        this.assignment(
            this.register('$!'), 
            this.binary_expression(pos, '-', this.number(1)),
            conditional);
    }
}

class L1Draw extends L0Draw{
    constructor(){
        super();
    }

    draw(vm){
        super.draw(vm);
        return;
    }
}
encoded_levels.push(decode('AGFzbQEAAAAADQZkeWxpbmvkHAQBAAABHAZgAX8AYAAAYAABf2ACf38Bf2ABfwF/YAJ/fwACWgQDZW52DV9fbWVtb3J5X2Jhc2UDfwADZW52DF9fdGFibGVfYmFzZQN/AANlbnYGbWVtb3J5AgABA2VudhlfX2luZGlyZWN0X2Z1bmN0aW9uX3RhYmxlAXAAAQMFBAEBAgMGBgF/AEEACwdQBBFfX3dhc21fY2FsbF9jdG9ycwAADnRyZWVfc2l0dGVyX0wxAAIMX19kc29faGFuZGxlAwIYX193YXNtX2FwcGx5X2RhdGFfcmVsb2NzAAEJBwEAIwELAQMKqhkEBAAQAQuGBgAjAEHYGmojAEHADWo2AgAjAEHcGmojADYCACMAQeAaaiMAQbAIajYCACMAQeQaaiMAQfAOajYCACMAQegaaiMAQcAbajYCACMAQfgaaiMAQYAKajYCACMAQfwaaiMAQYALajYCACMAQYAbaiMAQdILajYCACMAQYQbaiMAQdQLajYCACMAQYgbaiMAQeALajYCACMAQYwbaiMBNgIAIwBBwBtqIwBB5BlqNgIAIwBBxBtqIwBB9xlqNgIAIwBByBtqIwBBpxpqNgIAIwBBzBtqIwBBhxhqNgIAIwBB0BtqIwBB6BlqNgIAIwBB1BtqIwBB9BlqNgIAIwBB2BtqIwBB8RlqNgIAIwBB3BtqIwBBpRpqNgIAIwBB4BtqIwBBgRlqNgIAIwBB5BtqIwBBoRpqNgIAIwBB6BtqIwBB7xlqNgIAIwBB7BtqIwBBoxpqNgIAIwBB8BtqIwBB7RlqNgIAIwBB9BtqIwBB0xlqNgIAIwBB+BtqIwBBqhhqNgIAIwBB/BtqIwBB6BlqNgIAIwBBgBxqIwBBxhlqNgIAIwBBhBxqIwBB3BhqNgIAIwBBiBxqIwBBvhlqNgIAIwBBjBxqIwBB0xhqNgIAIwBBkBxqIwBByxhqNgIAIwBBlBxqIwBB+hhqNgIAIwBBmBxqIwBBzBlqNgIAIwBBnBxqIwBBmBhqNgIAIwBBoBxqIwBB2BlqNgIAIwBBpBxqIwBBvhhqNgIAIwBBqBxqIwBBoBlqNgIAIwBBrBxqIwBBhhlqNgIAIwBBsBxqIwBBmxlqNgIAIwBBtBxqIwBBsxhqNgIAIwBBuBxqIwBBoBhqNgIAIwBBvBxqIwBBjRhqNgIAIwBBwBxqIwBBgRlqNgIAIwBBxBxqIwBBsxlqNgIAIwBByBxqIwBB8xhqNgIAIwBBzBxqIwBB5RhqNgIAIwBB0BxqIwBBrBlqNgIAIwBB1BxqIwBB7BhqNgIAIwBB2BxqIwBBgBhqNgIAIwBB3BxqIwBBjBpqNgIAIwBB4BxqIwBB+RlqNgIACwgAIwBBsBpqC5ETAQV/IAEhAwNAIAAoAgAhAkEDIQQgACAAKAIYEQQAIQZBACEBAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAIANB//8DcQ4/AAEEBQgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAmJygpKissUVI2Uzc4OTo7PD0+P0BBQkNERUZHSElKS0xQWQtBACEEIAYNLAJAAkACQAJAAkACQAJAAkACQCACQdoATARAQSshAyACQSFrDiBrATo7CQIJCQkJCQ8LCQMJCQkJCQkJCQkJKistLC0uDAkLAkAgAkHbAGsODzgJBAkJCQkJBQYJBz0JBwALIAJB8wBrDgM9CAYHC0EiIQMMaQtBOyEDDGgLQTghAwxnC0EwIQMMZgtBEyEDDGULQQwhAwxkC0EFIQMMYwsgAkH8AEYNWwsgAkEqa0EFSQRAQTchAwxiCyACQQlrIgFBF0tBASABdEGTgIAEcUVyRQRAQQEhBEEAIQMMYgsgAkEwa0EKTw1WDGALQQAhBAJAAkAgAkEfTARAQQEgAnRBgMwAcUUgAkENS3INAQxhC0ErIQMCQCACQSBrDg5hYwEyMwECAQEBAQEBAwALIAJBwABGDQMgAkHbAEYNLwtBPCEDIAUhASACQTBrQQpJDWEMWAtBHyEDDGALQS0hAwxfC0EgIQMMXgtBACEEIAJBIkYNSCACRQ1SIAJBCkcNSgxSC0EAIQQgAkEfTARAIAJBCWtBAkkNWiACQQ1HDQIMWgsgAkEgRg1ZIAJBLEcNAQtBLyEDDFsLQTchAyAFIQEgAkEqa0EGSQ1aDFELIAJBL0cNTgxVC0EAIQRBCCEDIAUhAQJAAkAgAkExaw4IWlEAUVEBUVVRC0EGIQMMWQtBByEDDFgLIAJBMkcNTAxRCyACQTRGDVAMSwsgAkE2Rg1PDEoLIAJBPUcNSQxMCyACQT1HDUhBACEEQSkhAwxTCyACQT1HDUdBACEEQSohAwxSCyACQeEARw1GQQAhBEEZIQMMUQsgAkHhAEcNRUEAIQRBKCEDDFALIAJB4QBHDURBACEEQREhAwxPCyACQeMARw1DQQAhBEEOIQMMTgsgAkHsAEcNQkEAIQRBNiEDDE0LIAJB7ABHDUFBACEEQRAhAwxMCyACQe4ARw1AQQAhBEEXIQMMSwsgAkHvAEcNP0EAIQRBEiEDDEoLIAJB7wBHDT5BACEEQSwhAwxJCyACQe8ARw09QQAhBEEaIQMMSAsgAkHzAEcNPEEAIQRBDyEDDEcLIAJB8wBHDTtBACEEQRghAwxGCyACQfQARw06QQAhBEEnIQMMRQsgAkH0AEcNOUEAIQRBDSEDDEQLIAJB9ABHDThBACEEQRQhAwxDCyACQfkARw03QQAhBEEWIQMMQgtBACEEAkAgAkE6aw4GAQIEAwQFAAsgAkEJayIBQR1LDTdBASABdEGTgIAEcQRAQRwhA0EBIQQMQgsgAUEdRw03DDoLQQohAwxAC0ElIQMMPwtBCSEDDD4LQTohAww9C0ELIQMMPAtBACEEQTUhAyACQekAayIBQRBLDS9BASABdEG/gAZxDTsMLwsgAkHBAGtBGk8NLwwtC0EAIQRBMyEDIAJB3wBGDTkgBSEBIAJBX3FBwQBrQRpJDTkMMAtBACEEQTIhAyACQd8ARg04IAUhASACQV9xQcEAa0EaSQ04DC8LQQAhBEE+IQMgAkEgRiACQcEAa0EaSXIgAkEwa0EKSXINNyAFIQEgAkHhAGtBGkkNNwwuCyACRSACQQpGcg0rQQAhBAwjC0EAIQQgBkUNAQtBJCEDDDQLIAJBLkwEQEEmIQMgBSEBAkACQCACQQlrDgUBNi0tAQALIAJBIGsOBQAsLAQFLAtBASEEQSMhAww0CyACQeYASg0BIAJBL0YNBCACQdsARw0oC0EuIQMMMgsgAkHnAEYNAyACQfMARg0EDCYLQR4hAwwwC0EdIQMMLwtBBCEDDC4LQRUhAwwtC0EbIQMMLAsgAEECOwEEIAAgACgCDBEAAEEBIQUgAkEKRw0dQQAhBEEmIQMMKwtBBCEEDBsLQQUhBAwaC0EGIQQMGQtBByEEDBgLQQghBAwXC0EJIQQMFgtBCiEEDBULQQshBAwUC0EMIQQMEwtBDSEEDBILIABBDjsBBCAAIAAoAgwRAABBACEEQQEhBUEyIQMgAkHfAEYNIEEBIQEgAkFfcUHBAGtBGkkNIAwXCyAAQQ87AQQgACAAKAIMEQAAQQAhBEEBIQVBMyEDIAJB3wBGDR9BASEBIAJBX3FBwQBrQRpJDR8MFgsgAEEQOwEEIAAgACgCDBEAAEEBIQUgAkHBAGtBGkkNEQwQC0ERIQQMDgtBEiEEDA0LQRMhBAwMCyAAQRM7AQQgACAAKAIMEQAAQQEhBSACQS9GDRYMDAtBFCEEDAoLIABBFDsBBCAAIAAoAgwRAABBASEFIAJBPUYNEAwKCyAAQRQ7AQQgACAAKAIMEQAAQQAhBEEBIQVBMyEDIAJB3wBGDRdBASEBIAJBX3FBwQBrQRpJDRcMDgsgAEEVOwEEIAAgACgCDBEAAEEBIQUgAkEwa0EKSQ0VDAgLIABBFjsBBCAAIAAoAgwRAABBACEEQQEhBSACQSJHDQELQT0hAwwUCyACRSACQQpGcg0FC0ECIQMMEgsgAEEXOwEEIAAgACgCDBEAAEEAIQRBASEFQT4hAyACQSBGIAJBwQBrQRpJciACQTBrQQpJcg0RQQEhASACQeEAa0EaSQ0RDAgLQQAhBAwBC0EBIQQLIAAgBDsBBCAAIAAoAgwRAAALQQEhAQwEC0EAIQRBNCEDDAwLIAJBIWsiAkEeSw0AIAUhAUEBIAJ0QYGQgIAEcQ0LDAILIAUhAQwBCyACQfwARg0CQTchAyAFIQEgAkEqa0EGSQ0JCyABQQFxDwtBACEEC0E5IQMMBgtBACEEC0ExIQMMBAtBACEEQSEhAwwDC0EBIQRBAyEDDAILQQEhA0EBIQQMAQtBACEEQTwhAwsgACAEIAAoAggRBQAMAAsACwvrHAEAIwAL5BwLAAcAAQAIAAkAAQAKAAsAAQAQAA0AAQARAA8AAQASAAMAAQAoABkAAQAmAB0AAQAjACQAAQAdACsAAQAeADMAAgAfACAACwAHAAEACAAJAAEACgALAAEAEAANAAEAEQAPAAEAEgARAAEAAAAEAAEAKAAZAAEAJgAdAAEAIwArAAEAHgAzAAIAHwAgAAsAEwABAAAAFQABAAgAGAABAAoAGwABABAAHgABABEAIQABABIABAABACgAGQABACYAHQABACMAKwABAB4AMwACAB8AIAAGACQAAQADACcAAQAEAAUAAQAnAC8AAQAaAC4AAgAbABwAKgAFAAgACgAQABEAEgAGAAMAAQADAAUAAQAEAAUAAQAnAC8AAQAaAC4AAgAbABwALAAFAAgACgAQABEAEgAHAAkAAQAKAC4AAQAHADAAAQAJABcAAQAiABgAAQAmACoAAQAhADIABQAOAA8AEAARABUABgAJAAEACgAwAAEACQAXAAEAIgAYAAEAJgAwAAEAIQAyAAUADgAPABAAEQAVAAgABwABAAgACQABAAoADQABABEADwABABIAGQABACYAHQABACMAJQABAB4AMwACAB8AIAAEAAkAAQAKABgAAQAmADEAAQAiADIABQAOAA8AEAARABUABAAJAAEACgAYAAEAJgA1AAEAIgAyAAUADgAPABAAEQAVAAQAEwABAAAANAABAAIAOAABABcANgAFAAgACgAQABEAEgAEADoAAQAAADwAAQACAEAAAQAXAD4ABQAIAAoAEAARABIAAwBCAAEAAABEAAEAAgBGAAUACAAKABAAEQASAAMAOgABAAAAPAABAAIAPgAFAAgACgAQABEAEgABAEgABwADAAQACAAKABAAEQASAAEAQgAGAAAACAAKABAAEQASAAEASgAGAAAACAAKABAAEQASAAMAGwABACUAJgABACQATAAEAA4ADwARABUAAQA6AAYAAAAIAAoAEAARABIAAQBOAAUAAQAFAAYAEwAUAAIALQABACUATAAEAA4ADwARABUAAgBQAAEAAQBSAAIAEwAUAAEAVAADAAEAEwAUAAEAVgACAAUABgACAFgAAQALAFoAAQATAAIAXAABAAsAXgABABMAAQBgAAIAEAARAAEAYgACAAUABgABAGQAAQAAAAEAZgABAAEAAQBoAAEAAQABAGoAAQANAAEAbAABAA4AAQBuAAEAAgABAHAAAQAAAAEAcgABAAEAAQBcAAEACwABAHQAAQABAAEAdgABABYAAQB4AAEAFQABAHoAAQABAAEAfAABAAEAAQB+AAEADAABAIAAAQALAAEAggABAAEAAQCEAAEAAQABAIYAAQABAAEAiAABAAEAAQCKAAEAAAABAIwAAQABAAEAjgABAA8AAQCQAAEAAQAAAAAAAAAAAAAAAAAAACMAAABGAAAAaQAAAIEAAACZAAAAswAAAMoAAADkAAAA9QAAAAYBAAAXAQAAKAEAADYBAABEAQAATgEAAFcBAABgAQAAbQEAAHYBAAB+AQAAiAEAAJABAACWAQAAmwEAAKIBAACpAQAArgEAALMBAAC3AQAAuwEAAL8BAADDAQAAxwEAAMsBAADPAQAA0wEAANcBAADbAQAA3wEAAOMBAADnAQAA6wEAAO8BAADzAQAA9wEAAPsBAAD/AQAAAwIAAAcCAAALAgAADwIAAAABAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAIQAiACMAJAAlACYAJwAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAEAAAABAAAAIwAAACMAAAAjAAAAIwAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAHAAAAAEAAAAcAAAAHAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAjAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAAAAcAAAAJAAAAAAAAAAAAAAALAA0ADwAAAAAAAAAAAAAAMgACAC8ALgAuAB4AKwAzADMAAAAAAB0AAAAAABkABgADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAADAAAAAAAAAAEBAAAAAAAAAAAiAAAAAAABAQAAAAAAAAAANAAAAAAAAQEAAAAAAAAAABwAAAAAAAEBAAAAAAAAAAATAAAAAAABAQAAAAAAAAAACQAAAAAAAQEAAAAAAAAAABkAAAAAAAEBAAAAAAAAAAAzAAAAAAABAQAAAAAAAAEBHQAAAAAAAQEAAAAAAAABAigAAAAAAAIBAAAAAAAAAQIoAAAAAAAAABwAAAEAAAIBAAAAAAAAAQIoAAAAAAAAABMAAAEAAAIBAAAAAAAAAQIoAAAAAAAAAAkAAAEAAAIBAAAAAAAAAQIoAAAAAAAAABkAAAEAAAIBAAAAAAAAAQIoAAAAAAAAADMAAAEAAAIBAAAAAAAAAQInAAAAAAAAACIAAAEAAAIBAAAAAAAAAQInAAAAAAAAADQAAAEAAAEBAAAAAAAAAQInAAAAAAABAQAAAAAAAAEBGQAAAAAAAQEAAAAAAAAAAAgAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAAAGAAAAAAAAQEAAAAAAAAAABQAAAAAAAEAAAAAAAAAAQIoAAAAAAABAAAAAAAAAAAADwAAAAAAAQEAAAAAAAABAygAAAAAAAEBAAAAAAAAAAARAAAAAAABAAAAAAAAAAEDKAAAAAAAAQAAAAAAAAAAAA4AAAAAAAEBAAAAAAAAAQQoAAAAAAABAQAAAAAAAAAAEgAAAAAAAQAAAAAAAAABBCgAAAAAAAEBAAAAAAAAAQMnAAAAAAABAQAAAAAAAAEFKAAAAAAAAQEAAAAAAAAAABoAAAAAAAEBAAAAAAAAAQUmAAAAAAABAQAAAAAAAAEBIQAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAQEiAAAAAAABAQAAAAAAAAEBIwAAAAAAAQEAAAAAAAABASUAAAAAAAEAAAAAAAAAAQElAAAAAAABAQAAAAAAAAAAIQAAAAAAAQAAAAAAAAAAABYAAAAAAAEBAAAAAAAAAAAnAAAAAAABAQAAAAAAAAAABwAAAAAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAQMbAAAAAAABAQAAAAAAAAEDHAAAAAAAAQEAAAAAAAAAACwAAAAAAAEBAAAAAAAAAAApAAAAAAABAQAAAAAAAAAAEAAAAAAAAQEAAAAAAAABAhgAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAECIAAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAAAfAAAAAAABAQAAAAAAAAEDHwAAAAAAAQEAAAAAAAAAAAwAAAAAAAEBAAAAAAAAAAAVAAAAAAABAQAAAAAAAAEDJAAAAAAAAQEAAAAAAAABARoAAAAAAAEBAAAAAAAAAAAjAAAAAAABAQAAAAAAAAEEHwAAAAAAAQEAAAAAAAABAiEAAAAAAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEBHgAAAAAAAQEAAAAAAAAAACgAAAAAAAEBAAAAAAAAAQMhAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABjb21tZW50AHN0YXRlbWVudABjb25zdGFudABzdGF0ZW1lbnRzAGRlY2xhcmF0aW9ucwBsb2dpY2FsX29wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AbWVtb3J5X2V4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdHJpbmcAdHlwZQBzb3VyY2VfZmlsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALQAsACEACgAAAAAAAAAADQAAACkAAAAAAAAAGAAAAAAAAAA2AAAAAgAAAAEAAAAAAAAABQAAAMAGAAAAAAAAMAQAAHAHAADADQAAAAAAAAAAAAAAAAAAAAUAAIAFAADSBQAA1AUAAOAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5AwAAPcMAAAnDQAABwwAAOgMAAD0DAAA8QwAACUNAACBDAAAIQ0AAO8MAAAjDQAA7QwAANMMAAAqDAAA6AwAAMYMAABcDAAAvgwAAFMMAABLDAAAegwAAMwMAAAYDAAA2AwAAD4MAACgDAAAhgwAAJsMAAAzDAAAIAwAAA0MAACBDAAAswwAAHMMAABlDAAArAwAAGwMAAAADAAADA0AAPkMAAA='));
class L2Visitor extends L1Visitor {
    scope(node) {
        this._emitter.start_scope();
        this.visit(node.child(1));
        this._emitter.end_scope();
    }

    variable(node)  {
        var var_name = node.child(0).text;
        var var_size = node.child(2).text;
        var has_not = node.child(4).text === '!' ? true : false;
        var expression = null;
        if (has_not) {
            var expression = this.visit(node.child(5));
          } else {
            var expression = this.visit(node.child(4));
          }
        return this._emitter.variable(var_name, var_size, expression, has_not);
    }

    variable_name(node) {
        var var_name = node.text;

        return this._emitter.variable_name(var_name);
    }
}

class L2Emitter extends L1Emitter{
    variables = {}
    head = null
    stack_pointer = 128;
    frame_pointer = 128;
    in_scope = false;

    variable(var_name, var_size, expression, has_not = false) {
        if (this.in_scope) {
            this.create_temp_var(var_name, var_size, expression, has_not);
        } else {
            this.variable_declaration(var_name, var_size, expression, has_not)
        }
    }

    variable_name(var_name) {
        if (this.in_scope) {
            return this.read_var_name(var_name);
        } else {
            var p_var = '&_' + var_name;
            return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
        }
    }

    variable_declaration(var_name, var_size, expression, has_not) {
        var p_var = '&_' + var_name;
        var byte_size = get_variable_bytesize(var_size)
        var writer = this.read_var(p_var, var_size);
        if (writer === null) {
            this.variables[p_var] = var_size;
            var memory_allocation = "";
            for (var i = 0; i < byte_size; i++) {
                memory_allocation += "0";
            }

            this._data[p_var] = memory_allocation;
        }
        
        this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), null];
        this.assignment(
            this.memory(this.data(p_var), get_datatype(var_size)), 
            expression, false, has_not);
    }

    create_temp_var(var_name, var_size, expression, has_not) {
        var variable_size = get_variable_bytesize(var_size);
        var writer = this.read_var(var_name, var_size);
        if (writer === null) {
            this.frame_pointer -= variable_size;
            this.head.variables[var_name] = [this.stack_pointer - this.frame_pointer, var_size];
            var writer = this.read_var(var_name, var_size);
        }
        this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), structuredClone(this.head)];
        this.assignment(writer, expression, false, has_not);
    }

    read_var_name(var_name) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                return this.memory(this.binary_expression(this.register('$fp'), '-', this.number(current.variables[var_name][0])), get_datatype(current.variables[var_name][1]))
            }   
            current = current.next;
        }
        var p_var = '&_' + var_name;
        if (Object.keys(this.variables).find(key => key == p_var) !== undefined) {
            return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
        }
        // TODO: check if node.text is in variable dict otherwise return error
        return null;
    }

    read_var(var_name, var_size) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                if (current.variables[var_name][1] === var_size) {
                    return this.memory(this.binary_expression(this.register('$fp'), '-', this.number(current.variables[var_name][0])), get_datatype(current.variables[var_name][1]))
                }   
            }   
            current = current.next;
        }

        var p_var = '&_' + var_name;
        if (Object.entries(this.variables).find(variable => variable[0] === p_var && variable[1] === var_size) !== undefined) {
            return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
        }
        
        // TODO: check if node.text is in variable dict otherwise return error
        return null;
    }

    start_scope() {
        var frame = new StackFrame();
        frame.next = this.head;
        this.head = frame;
        this.in_scope = true;

        this.Stack.push(this.frame_pointer);
    }

    end_scope(update_final_state = true) {
        var offset = this.Stack.pop() - this.frame_pointer;
        this.head = this.head.next;
        this.frame_pointer += offset;
        if (this.head === null) {
            this.in_scope = false;
        }

        //Because exiting the scope is not part of the bytecode instruction, the new variables are only reflected when the next instruction is drawn.
        //To fix this, the state of the previous instruction, which is the final instruction before the scope ends, is updated to reflect this change.
        if(update_final_state){
            this._drawer.variable_states[this._statements.length - 1] = [structuredClone(this.variables), structuredClone(this.head)];
        }else{
            this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), structuredClone(this.head)];
        }
        
    }

    Stack = {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        }
    }
}


class StackFrame {
    next;
    variables;
    constructor() {
        this.next= null;
        this.variables = {};
    }
}

class L2Draw extends L1Draw{
    constructor(){
        super();
        this.variable_states = {};
    }

    draw(vm) {
        super.draw(vm);

        var container = document.getElementById("lx-container");
        container.style.display = "inline-block";

        var existingContainer = document.getElementById("table-wrapper-container");
        if (existingContainer) {
          container.removeChild(existingContainer);
        }

        var state = this.find_state(this.variable_states, vm.state.registers['$!']-1)
        if(this.is_empty_state(state)){
            return;
        }
        var wrapperContainer = document.createElement("div");
        wrapperContainer.id = "table-wrapper-container";

        

        var variables = state[0]
        if (Object.keys(variables).length !== 0) {
            this.create_wrapper(variables, vm, wrapperContainer)
        }
        var stack_head = state[1];

        // save the stack in an array in order to print it from the bottom of the stack
        var temp_var_stack = [];
        while (stack_head != null) {
            temp_var_stack.push(stack_head);
            stack_head = stack_head.next;
        }
        for (var i = temp_var_stack.length-1; i >= 0; i--) {
            if(Object.keys(temp_var_stack[i].variables).length > 0){
                this.create_wrapper(temp_var_stack[i].variables, vm, wrapperContainer)
            }
        }
        
        container.appendChild(wrapperContainer)

    }

    create_wrapper(variables, vm, container){
        var table = this.create_table_from_variables(variables, vm)
        var tableWrapper = document.createElement("L2Div");
        tableWrapper.style.display = "block";
        tableWrapper.appendChild(table);
        
        tableWrapper.style.border = "1px solid black";
        tableWrapper.style.padding = "10px";
        tableWrapper.style.width = "150px";
        tableWrapper.style.textAlign = "center";
        tableWrapper.style.borderCollapse = "collapse";
        container.appendChild(tableWrapper);
    }

    create_table_from_variables(variables, vm){
        var table = document.createElement("L2Table");
        for(var name in variables){
            var row = document.createElement("tr");

            var nameCell = document.createElement("td");
            var newName = name;
            if(!isNaN(name)){
                var offset = vm.memorySize-parseInt(name);
                newName = "$fp - "+offset;
            }
            nameCell.textContent = newName;
            nameCell.style.borderRight = "2px solid black";
            nameCell.style.paddingRight = "10px"
            row.appendChild(nameCell);


            var value = variables[name];
            var valueCell = document.createElement("td");
            var memory_access;
            //Check if scoped
            if(Array.isArray(value)){
                memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.NUMBER, vm.memorySize-value[0]), get_datatype(value[1]));
            }else{
                memory_access = new Content(CONTENT_TYPES.MEMORY, new Content(CONTENT_TYPES.DATA, name), get_datatype(value));
            }
            
            valueCell.textContent = vm.read(memory_access);
            valueCell.style.paddingLeft = "10px"
            row.appendChild(valueCell);
            table.appendChild(row);
        }

        return table
    }

    find_state(map, key) {
        let result = map[key];
        let currentKey = key;

        while(result === undefined){
            currentKey -= 1;
            result = map[currentKey];
            if(currentKey <= 0){
                result = null;
                break;
            }
        }
        return result;
      }
      
    is_empty_state(state) {
        if (state == null) {
            return true;
        }

        if (Object.keys(state[0]).length !== 0) {
            return false;
        }

        if (this.is_empty_stack(state[1])) {
            return true;
        }

        return false;
    }

    is_empty_stack(stack) {
        var current = stack;
        var is_empty = true;
        while (current != null) {
            if (Object.keys(current.variables).length !== 0) {
                is_empty = false;
                break;
            }   
            current = current.next;
        }
        return is_empty;
    }
}
encoded_levels.push(decode('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AwsgACAEIAAoAggRBQAMAAsACwvbJgEAIwAL1CYPAAcAAQAFAAkAAQAKAAsAAQAOAA0AAQAUAA8AAQAVABEAAQAWABMAAQAbAAMAAQAwABAAAQAkABEAAQAlACQAAQAuACUAAQArADEAAQAjABUAAgAAAAYALgADACYAJwAoAA8AGQABAAUAHAABAAoAHwABAA4AIgABABQAJQABABUAKAABABYAKwABABsAAwABADAAEAABACQAEQABACUAJAABAC4AJQABACsAMQABACMAFwACAAAABgAuAAMAJgAnACgADwAHAAEABQAJAAEACgALAAEADgANAAEAFAAPAAEAFQARAAEAFgATAAEAGwACAAEAMAAQAAEAJAARAAEAJQAkAAEALgAlAAEAKwAxAAEAIwA+AAEAIgAuAAMAJgAnACgADwAHAAEABQAJAAEACgALAAEADgANAAEAFAAPAAEAFQARAAEAFgATAAEAGwACAAEAMAAQAAEAJAARAAEAJQAkAAEALgAlAAEAKwAnAAEAIgAxAAEAIwAuAAMAJgAnACgADAAHAAEABQAJAAEACgALAAEADgAPAAEAFQARAAEAFgATAAEAGwALAAEAJAARAAEAJQAkAAEALgAlAAEAKwA5AAEAIwAuAAMAJgAnACgABwADAAEAAwAFAAEABAAIAAEALwAsAAEAHwAtAAIAIAAhADAAAwAKABYAGwAuAAQABQAOABQAFQAHADIAAQADADUAAQAEAAgAAQAvACwAAQAfAC0AAgAgACEAOgADAAoAFgAbADgABAAFAA4AFAAVAAcACwABAA4APAABAAkAPgABAA0AHwABACoAIAABAC4AQQABACkAQAAGABIAEwAUABUAGQAbAAcACwABAA4APgABAA0AQgABAAkAHwABACoAIAABAC4ANAABACkAQAAGABIAEwAUABUAGQAbAAQAFwABAAAARAABAAIASAABABwARgAIAAUABgAKAA4AFAAVABYAGwAGAAsAAQAOAD4AAQANAB8AAQAqACAAAQAuAEMAAQApAEAABgASABMAFAAVABkAGwAGAAsAAQAOAD4AAQANAB8AAQAqACAAAQAuADsAAQApAEAABgASABMAFAAVABkAGwAEAEoAAQAAAEwAAQACAFAAAQAcAE4ACAAFAAYACgAOABQAFQAWABsAAgBSAAIAAAACAFQACQAFAAYACgAOABQAFQAWABsAHAAEAFYAAQAAAFgAAQACAFwAAQAcAFoACAAFAAYACgAOABQAFQAWABsAAgBeAAIAAAACAGAACQAFAAYACgAOABQAFQAWABsAHAADAGIAAQAAAGQAAQACAGYACAAFAAYACgAOABQAFQAWABsAAwAXAAEAAABEAAEAAgBGAAgABQAGAAoADgAUABUAFgAbAAMASgABAAAATAABAAIATgAIAAUABgAKAA4AFAAVABYAGwACAEYAAwAKABYAGwAXAAYAAAAFAAYADgAUABUAAgBqAAMACgAWABsAaAAGAAAABQAGAA4AFAAVAAQACwABAA4AIAABAC4AQgABACoAQAAGABIAEwAUABUAGQAbAAIAZgADAAoAFgAbAGIABgAAAAUABgAOABQAFQAEAAsAAQAOACAAAQAuADwAAQAqAEAABgASABMAFAAVABkAGwACAG4ABAAFAA4AFAAVAGwABQADAAQACgAWABsAAgBOAAMACgAWABsASgAGAAAABQAGAA4AFAAVAAMAIwABAC0AOgABACwAcAAEABIAEwAVABkAAgA3AAEALQBwAAQAEgATABUAGQABAHIABQABAAcACAAXABgAAgB0AAEAAQB2AAIAFwAYAAEAeAADAAEAFwAYAAEAegACABQAFQACAHwAAQAPAH4AAQAXAAIAgAABAA8AggABABcAAQCEAAIABwAIAAEAhgACAAcACAABAIgAAQALAAEAigABAAAAAQCMAAEAAQABAI4AAQAAAAEAkAABABEAAQCSAAEAGQABAJQAAQABAAEAlgABAAEAAQCYAAEAAQABAJoAAQAMAAEAnAABAAAAAQCeAAEAAQABAKAAAQASAAEAogABAAIAAQCkAAEAAQABAKYAAQABAAEAqAABABAAAQCqAAEADwABAKwAAQARAAEArgABAAEAAQCAAAEADwABALAAAQABAAEAsgABAAEAAQC0AAEAAQABALYAAQAGAAEAuAABABoAAQC6AAEAEwABALwAAQABAAEAvgABAAEAAQDAAAEAAQAAAAAAAAAAAAAAAAAAAAAAMQAAAGIAAACSAAAAwgAAAOkAAAAFAQAAIQEAADwBAABXAQAAawEAAIMBAACbAQAArwEAAL8BAADTAQAA4wEAAPQBAAAFAgAAFgIAACQCAAAyAgAARAIAAFICAABkAgAAcgIAAIACAACNAgAAlwIAAJ8CAACnAgAArQIAALICAAC5AgAAwAIAAMUCAADKAgAAzgIAANICAADWAgAA2gIAAN4CAADiAgAA5gIAAOoCAADuAgAA8gIAAPYCAAD6AgAA/gIAAAIDAAAGAwAACgMAAA4DAAASAwAAFgMAABoDAAAeAwAAIgMAACYDAAAqAwAALgMAADIDAAA2AwAAOgMAAD4DAAAAAAAAAAAAAAABAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEAAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAJgAnACgAKQAqACsALAAtAC4ALwAwAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAUAAAAFAAAABQAAAAUAAAAFAAAAAMAAAADAAAAAQAAAAEAAAATAAAAAQAAAAEAAAATAAAAEwAAABMAAAATAAAAEwAAABMAAAATAAAAFAAAABQAAAABAAAAFAAAAAEAAAADAAAAFAAAAAMAAAADAAAAFAAAABQAAAAUAAAAAAAAAAMAAAADAAAAAwAAAAMAAAABAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAEwAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABQAHAAAAAAAAAAAACQAAAAAAAAALAAAAAAAAAAAAAAANAA8AEQAAAAAAAAAAABMAAAApAAUALAAtAC0AMAAxABAAEQAuAC4ALgAAAAAAJQAAAAAAJAAHAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAADIAAAAAAAEAAAAAAAAAAABAAAAAAAABAQAAAAAAAAAABAAAAAAAAQAAAAAAAAAAACEAAAAAAAEBAAAAAAAAAAAcAAAAAAABAQAAAAAAAAAABgAAAAAAAQEAAAAAAAAAACQAAAAAAAEAAAAAAAAAAAAuAAAAAAABAAAAAAAAAAAAJgAAAAAAAQEAAAAAAAABASIAAAAAAAEBAAAAAAAAAQIwAAAAAAACAQAAAAAAAAECMAAAAAAAAAAEAAABAAACAAAAAAAAAAECMAAAAAAAAAAhAAABAAACAQAAAAAAAAECMAAAAAAAAAAcAAABAAACAQAAAAAAAAECMAAAAAAAAAAGAAABAAACAQAAAAAAAAECMAAAAAAAAAAkAAABAAACAAAAAAAAAAECMAAAAAAAAAAuAAABAAACAAAAAAAAAAECMAAAAAAAAAAmAAABAAABAQAAAAAAAAEBHgAAAAAAAQAAAAAAAAABAR4AAAAAAAIAAAAAAAAAAQIvAAAAAAAAADIAAAEAAAIAAAAAAAAAAQIvAAAAAAAAAEAAAAEAAAEBAAAAAAAAAQIvAAAAAAABAAAAAAAAAAECLwAAAAAAAQEAAAAAAAAAAAwAAAAAAAEBAAAAAAAAAAAZAAAAAAABAQAAAAAAAAAAIAAAAAAAAQEAAAAAAAAAAA0AAAAAAAEBAAAAAAAAAAAbAAAAAAABAAAAAAAAAAECMAAAAAAAAQAAAAAAAAAAABQAAAAAAAEBAAAAAAAAAQMwAAAAAAABAQAAAAAAAAAAGAAAAAAAAQAAAAAAAAABAzAAAAAAAAEAAAAAAAAAAAASAAAAAAABAQAAAAAAAAEDJQAAAAAAAQAAAAAAAAABAyUAAAAAAAEBAAAAAAAAAQEwAAAAAAABAQAAAAAAAAAAFQAAAAAAAQAAAAAAAAABATAAAAAAAAEAAAAAAAAAAAATAAAAAAABAQAAAAAAAAEBJAAAAAAAAQAAAAAAAAABASQAAAAAAAEBAAAAAAAAAQQwAAAAAAABAQAAAAAAAAAAFgAAAAAAAQAAAAAAAAABBDAAAAAAAAEBAAAAAAAAAQUwAAAAAAABAAAAAAAAAAEFMAAAAAAAAQAAAAAAAAABAy8AAAAAAAEBAAAAAAAAAQMvAAAAAAABAQAAAAAAAAAAIgAAAAAAAQEAAAAAAAABBS4AAAAAAAEBAAAAAAAAAQEpAAAAAAABAQAAAAAAAAAAFwAAAAAAAQEAAAAAAAABASoAAAAAAAEBAAAAAAAAAAA9AAAAAAABAQAAAAAAAAEBLQAAAAAAAQAAAAAAAAABAS0AAAAAAAEBAAAAAAAAAAAqAAAAAAABAAAAAAAAAAAAHQAAAAAAAQEAAAAAAAABASsAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAAAOAAAAAAAAQEAAAAAAAABAh0AAAAAAAEBAAAAAAAAAQMhAAAAAAABAQAAAAAAAAIAAAAAAAAAAQEAAAAAAAAAADYAAAAAAAEBAAAAAAAAAAA1AAAAAAABAQAAAAAAAAAAMwAAAAAAAQEAAAAAAAABAR8AAAAAAAEBAAAAAAAAAQEjAAAAAAABAQAAAAAAAAAACQAAAAAAAQEAAAAAAAABAR0AAAAAAAEBAAAAAAAAAAALAAAAAAABAQAAAAAAAAAAKwAAAAAAAQEAAAAAAAAAABoAAAAAAAEBAAAAAAAAAQMmAAAAAAABAQAAAAAAAAEDIAAAAAAAAQEAAAAAAAAAAB4AAAAAAAEBAAAAAAAAAQMsAAAAAAABAQAAAAAAAAAALwAAAAAAAQEAAAAAAAAAAA4AAAAAAAEBAAAAAAAAAQQmAAAAAAABAQAAAAAAAAECKQAAAAAAAQEAAAAAAAABAicAAAAAAAEBAAAAAAAAAAAPAAAAAAABAQAAAAAAAAAAKAAAAAAAAQEAAAAAAAAAAD8AAAAAAAEBAAAAAAAAAQUoAAAAAAABAQAAAAAAAAEDKQAAAAAAAQEAAAAAAAABBigAAAAAAH0AewBtZW1vcnkAY29uc3QAYXNzaWdubWVudABjb21tZW50AHN0YXRlbWVudABjb25zdGFudABzdGF0ZW1lbnRzAGRlY2xhcmF0aW9ucwBsb2dpY2FsX29wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AbWVtb3J5X2V4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdGF0ZW1lbnRfYmxvY2sAc3RyaW5nAHR5cGUAc2NvcGUAdmFyaWFibGVfbmFtZQBzb3VyY2VfZmlsZQB2YXJpYWJsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwA6AHN0YXRlbWVudHNfcmVwZWF0MQBkZWNsYXJhdGlvbnNfcmVwZWF0MQAtACwAIQAKAAAAAAANAAAAMQAAAAAAAAAdAAAAAAAAAEQAAAACAAAAAQAAAAAAAAAGAAAAwAkAAAAAAACQBgAAkAoAAJASAAAAAAAAAAAAAAAAAACgBwAAQAgAAKIIAACkCAAAsAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC1EQAAyBEAAPoRAACrEAAAuREAAKIQAACgEAAAxREAAMIRAAD4EQAAJREAAMoRAADGEQAA9BEAAMARAAD2EQAAvhEAAIcRAADOEAAAuREAAGoRAAAAEQAAYhEAAPcQAADvEAAAHhEAAIARAACSEQAAvBAAAKARAADiEAAARBEAACoRAAA/EQAA1xAAAMQQAABwEQAAjBEAALEQAAAlEQAArBEAAFcRAAAXEQAACREAAFARAAAQEQAApBAAAN8RAADMEQAA'));
class L3Visitor extends L2Visitor {
    expression(node) {
        // if the expression does not contain any sub-expressions it should be sent down to L0 instead of being handled here.
        if (!this.has_sub_expression(node)) {
            //node_stack.push(node);
            return super.expression(node);
        }
        // The algo:

        // Start scope
        // recursively handle the left child
        // If the right child is an expression, save result in a temporary variable
        // Else save in $x
        // recursively handle right side
        // If we are out of scopes it is the last expression and we save the result in $x
        // Else we return the full expression: left_expression & right_expression
        // end scope

        this._emitter.start_scope();

        var left_child = get_left_child(node);
        var right_child = get_right_child(node);

        //Handle left side
        var left_expression = this.visit(left_child);
        

        var is_nested_expression = right_child.type === 'expression';
        this._emitter.node_stack.push(left_child);
        left_expression = this._emitter.left_expression(left_expression, is_nested_expression);
        this._emitter.node_stack.pop();

        //Handle right side
        var right_expression = this.visit(right_child);
        if(this.is_binary_expression(right_child)){
        //    this._emitter.node_stack.push(right_child);
            this._emitter.node_stack.push(right_child);
            this._emitter.save_to_register_x(right_expression)
            this._emitter.node_stack.pop();
        }

        //Sum both sides
        //this._emitter.node_stack.push(node)
        var operator = get_operator(node).text;
        var full_expression = this._emitter.full_expression(left_expression, operator, right_expression);
        this._emitter.end_scope(false);

        var result = this._emitter.result(full_expression);
        return result;
    }

    has_sub_expression(expression) {
        for (var i = 0; i < expression.childCount; i++) {
            if (expression.child(i).type === 'expression') {
                return true;
            } 
        }
        return false;
    }

    is_binary_expression(node){
        return node.childCount >= 3;
    }

}

class L3Emitter extends L2Emitter{

    left_expression (left_expression, is_nested_expression ){
        if (is_nested_expression) {
            var bytesize = 'u8';
            this.create_temp_var(this.frame_pointer - get_variable_bytesize(bytesize), bytesize, left_expression);
            return this.read_var(`${this.frame_pointer}`, bytesize);
        }
        // Else we can just write it directly into $x
        else {
            this.save_to_register_x(left_expression);
            return this.register('$x');
        }
    }

    save_to_register_x(expression){
        this.assignment(this.register('$x'), expression);
    }

    full_expression(left_expression, operator, right_expression) {
        // If it is a binary assignment we have to save the right expression in a register before combining it with the left expression
        if (get_opcode(right_expression) === OP.ASSIGN_BIN) {
            return this.binary_expression(left_expression, operator, this.register('$x'));
        } else {
            return this.binary_expression(left_expression, operator, right_expression);
        }
    }

    result(full_expression){
        // If we are out of the scope we know we have handled the entire expression and we can save the final expression in $x and return $x to the caller (assignment)
        if (!this.in_scope) {
            this.save_to_register_x(full_expression);
            return this.expression(this.register('$x'));
        }else{
            return full_expression;
        }
    }
}

class L3Draw extends L2Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}
encoded_levels.push(decode('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BHFFDQsMEAsgBSEBDAoLQQAhBEEFIQMgBSEBAkAgAkHmAGsOBA8KCg8ACyACQfUARw0JDA4LQQAhBEEcIQMMDQtBACEEC0E1IQMMCwtBACEEC0EuIQMMCQtBACEEQREhAwwICyACQdsARw0BC0ErIQMMBgtBygAhAyACQd8ARg0FIAUhASACQV9xQcEAa0EaSQ0FCyABQQFxDwtBOCEDDAMLQQEhA0EBIQQMAgtBNyEDDAELQRUhAwsgACAEIAAoAggRBQAMAAsACwvvLgEAIwAL6C4PAAcAAQAFAAkAAQAKAAsAAQATAA0AAQAZAA8AAQAaABEAAQAbABMAAQAgAAMAAQA1ABQAAQApABUAAQAqACoAAQAzACsAAQAwAEEAAQAoABUAAgAAAAYAQwADACsALAAtAA8AGQABAAUAHAABAAoAHwABABMAIgABABkAJQABABoAKAABABsAKwABACAAAwABADUAFAABACkAFQABACoAKgABADMAKwABADAAQQABACgAFwACAAAABgBDAAMAKwAsAC0ADwAHAAEABQAJAAEACgALAAEAEwANAAEAGQAPAAEAGgARAAEAGwATAAEAIAACAAEANQAUAAEAKQAVAAEAKgAqAAEAMwArAAEAMABBAAEAKABFAAEAJwBDAAMAKwAsAC0ADwAHAAEABQAJAAEACgALAAEAEwANAAEAGQAPAAEAGgARAAEAGwATAAEAIAACAAEANQAUAAEAKQAVAAEAKgAqAAEAMwArAAEAMAA+AAEAJwBBAAEAKABDAAMAKwAsAC0ADAAHAAEABQAJAAEACgALAAEAEwAPAAEAGgARAAEAGwATAAEAIAATAAEAKQAVAAEAKgAqAAEAMwArAAEAMAA5AAEAKABDAAMAKwAsAC0ACAALAAEAEwAuAAEACQAwAAEADQAyAAEAEgAlAAEALwAmAAEAMwBEAAEALgA0AAYAFwAYABkAGgAeACAABwA2AAEAAwA5AAEABAAIAAEANABTAAEAJABJAAIAJQAmAD4AAwAKABsAIAA8AAQABQATABkAGgAHAAMAAQADAAUAAQAEAAgAAQA0AFMAAQAkAEkAAgAlACYAQgADAAoAGwAgAEAABAAFABMAGQAaAAgACwABABMAMAABAA0AMgABABIARAABAAkAJQABAC8AJgABADMAOgABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMATQABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMASgABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMARgABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMAVAABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMAPAABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMATgABAC4ANAAGABcAGAAZABoAHgAgAAcACwABABMAMAABAA0AMgABABIAJQABAC8AJgABADMANwABAC4ANAAGABcAGAAZABoAHgAgAAQARgABAAAASAABAAIATAABACEASgAIAAUABgAKABMAGQAaABsAIAAEABcAAQAAAE4AAQACAFIAAQAhAFAACAAFAAYACgATABkAGgAbACAABABUAAEAAABWAAEAAgBaAAEAIQBYAAgABQAGAAoAEwAZABoAGwAgAAIAXAACAAAAAgBeAAkABQAGAAoAEwAZABoAGwAgACEAAgBgAAIAAAACAGIACQAFAAYACgATABkAGgAbACAAIQAFAAsAAQATAGQAAQANACYAAQAzADEAAQAvADQABgAXABgAGQAaAB4AIAADAEYAAQAAAEgAAQACAEoACAAFAAYACgATABkAGgAbACAABQALAAEAEwBmAAEADQAmAAEAMwAuAAEALwA0AAYAFwAYABkAGgAeACAABQALAAEAEwBoAAEADQAmAAEAMwAvAAEALwA0AAYAFwAYABkAGgAeACAABQALAAEAEwBqAAEADQAmAAEAMwAyAAEALwA0AAYAFwAYABkAGgAeACAAAwBsAAEAAABuAAEAAgBwAAgABQAGAAoAEwAZABoAGwAgAAMAFwABAAAATgABAAIAUAAIAAUABgAKABMAGQAaABsAIAACAHQAAwAKABsAIAByAAYAAAAFAAYAEwAZABoAAQB2AAkAAQAHAAgADgAPABAAEQASAB0AAgBwAAMACgAbACAAbAAGAAAABQAGABMAGQAaAAQACwABABMAJgABADMANAABAC8ANAAGABcAGAAZABoAHgAgAAIAUAADAAoAGwAgABcABgAAAAUABgATABkAGgACAHoABAAFABMAGQAaAHgABQADAAQACgAbACAAAgBKAAMACgAbACAARgAGAAAABQAGABMAGQAaAAMAfAACAAEADgCAAAIAEQASAH4AAwAPABAAHQABAIIABwABAA4ADwAQABEAEgAdAAMANQABADIAPwABADEAhAAEABcAGAAaAB4AAgCIAAIAEQASAIYAAwAPABAAHQACADgAAQAyAIQABAAXABgAGgAeAAEAigACAAcACAABAIwAAgAHAAgAAQCOAAIAAQAOAAEAjgACAAEADgABAJAAAgABAA4AAQCQAAIAAQAOAAEAkgACABkAGgABAJQAAgABAA4AAQCUAAIAAQAOAAIAlgABABQAmAABABwAAQCaAAIAAQAOAAIAnAABABQAngABABwAAQCgAAEAAAABAKIAAQAOAAEApAABABQAAQCmAAEAAQABAKgAAQABAAEAqgABAAAAAQCsAAEAAQABAK4AAQAWAAEAsAABAAAAAQCcAAEAFAABALIAAQALAAEAtAABAAEAAQC2AAEAAQABALgAAQABAAEAugABAAEAAQC8AAEABgABAL4AAQAOAAEAwAABABUAAQDCAAEAFwABAMQAAQABAAEAxgABAAEAAQDIAAEAHgABAMoAAQACAAEAzAABAA4AAQDOAAEADgABANAAAQAMAAEA0gABAB8AAQDUAAEAGAABANYAAQAWAAEA2AABAAEAAQDaAAEADgABANwAAQABAAEA3gABAAEAAAAAAAAAAAAxAAAAYgAAAJIAAADCAAAA6QAAAAcBAAAjAQAAPwEAAF0BAAB4AQAAkwEAAK4BAADJAQAA5AEAAP8BAAAaAgAALgIAAEICAABWAgAAZgIAAHYCAACLAgAAnAIAALECAADGAgAA2wIAAOwCAAD9AgAACwMAABcDAAAlAwAANwMAAEUDAABTAwAAYQMAAG8DAAB5AwAAhgMAAJADAACaAwAAnwMAAKQDAACpAwAArgMAALMDAAC4AwAAvQMAAMIDAADHAwAAzgMAANMDAADaAwAA3gMAAOIDAADmAwAA6gMAAO4DAADyAwAA9gMAAPoDAAD+AwAAAgQAAAYEAAAKBAAADgQAABIEAAAWBAAAGgQAAB4EAAAiBAAAJgQAACoEAAAuBAAAMgQAADYEAAA6BAAAPgQAAEIEAABGBAAASgQAAE4EAABSBAAAVgQAAFoEAAAAAAAAAAAAAAAAAAAAAQABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAJQAmACcAKAApACoAKwAsAC0ALgAvADAAMQAyADMANAA1AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAUAAAAFAAAABQAAAAUAAAAFAAAAAEAAAADAAAAAwAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAEwAAABMAAAATAAAAEwAAABMAAAABAAAAEwAAAAEAAAABAAAAAQAAABMAAAATAAAAFAAAAAMAAAAUAAAAAQAAABQAAAADAAAAFAAAAAMAAAADAAAAFAAAAAMAAAAUAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFAAAAAAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMAAAAAAAAAAAAAABQAAAAAAAAAFAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQAAAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABQAHAAAAAAAAAAAACQAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAADQAPABEAAAAAAAAAAAATAAAAOwAFAFMASQBJADYAQQAUABUAQwBDAEMAAAAAACsAAAAAACoACQACAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAAEgAAAAAAAEAAAAAAAAAAABRAAAAAAABAQAAAAAAAAAABAAAAAAAAQAAAAAAAAAAADAAAAAAAAEBAAAAAAAAAAAnAAAAAAABAQAAAAAAAAAABgAAAAAAAQEAAAAAAAAAACoAAAAAAAEAAAAAAAAAAABDAAAAAAABAAAAAAAAAAAAQAAAAAAAAQEAAAAAAAABAScAAAAAAAEBAAAAAAAAAQI1AAAAAAACAQAAAAAAAAECNQAAAAAAAAAEAAABAAACAAAAAAAAAAECNQAAAAAAAAAwAAABAAACAQAAAAAAAAECNQAAAAAAAAAnAAABAAACAQAAAAAAAAECNQAAAAAAAAAGAAABAAACAQAAAAAAAAECNQAAAAAAAAAqAAABAAACAAAAAAAAAAECNQAAAAAAAABDAAABAAACAAAAAAAAAAECNQAAAAAAAABAAAABAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAAAAA0AAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAAAJgAAAAAAAgAAAAAAAAABAjQAAAAAAAAASAAAAQAAAgAAAAAAAAABAjQAAAAAAAAAUQAAAQAAAQEAAAAAAAABAjQAAAAAAAEAAAAAAAAAAQI0AAAAAAABAQAAAAAAAAEBIwAAAAAAAQAAAAAAAAABASMAAAAAAAEBAAAAAAAAAAAPAAAAAAABAQAAAAAAAAEDNQAAAAAAAQEAAAAAAAAAACAAAAAAAAEAAAAAAAAAAQM1AAAAAAABAAAAAAAAAAAAHAAAAAAAAQEAAAAAAAAAACQAAAAAAAEAAAAAAAAAAQI1AAAAAAABAAAAAAAAAAAAGAAAAAAAAQEAAAAAAAABATUAAAAAAAEBAAAAAAAAAAAiAAAAAAABAAAAAAAAAAEBNQAAAAAAAQAAAAAAAAAAAB0AAAAAAAEBAAAAAAAAAQEpAAAAAAABAAAAAAAAAAEBKQAAAAAAAQEAAAAAAAABAyoAAAAAAAEAAAAAAAAAAQMqAAAAAAABAQAAAAAAAAAAEAAAAAAAAQEAAAAAAAAAAA4AAAAAAAEBAAAAAAAAAAARAAAAAAABAQAAAAAAAAAACwAAAAAAAQEAAAAAAAABBDUAAAAAAAEBAAAAAAAAAAAeAAAAAAABAAAAAAAAAAEENQAAAAAAAQEAAAAAAAABBTUAAAAAAAEAAAAAAAAAAQU1AAAAAAABAQAAAAAAAAEFMwAAAAAAAQAAAAAAAAABAzQAAAAAAAEBAAAAAAAAAQM0AAAAAAABAQAAAAAAAAEBLgAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAAXAAAAAAABAQAAAAAAAAEBLwAAAAAAAQEAAAAAAAAAADMAAAAAAAEBAAAAAAAAAAAaAAAAAAABAQAAAAAAAAAAGQAAAAAAAQEAAAAAAAABATAAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAEHLgAAAAAAAQEAAAAAAAABBS4AAAAAAAEBAAAAAAAAAABCAAAAAAABAQAAAAAAAAEDLgAAAAAAAQEAAAAAAAABATIAAAAAAAEAAAAAAAAAAQEyAAAAAAABAQAAAAAAAAECLgAAAAAAAQEAAAAAAAAAAFIAAAAAAAEAAAAAAAAAAAApAAAAAAABAQAAAAAAAAEBIgAAAAAAAQEAAAAAAAAAAC0AAAAAAAEBAAAAAAAAAQMxAAAAAAABAQAAAAAAAAAAEgAAAAAAAQEAAAAAAAABAysAAAAAAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEEKwAAAAAAAQEAAAAAAAAAAE8AAAAAAAEBAAAAAAAAAQIiAAAAAAABAQAAAAAAAAAAPQAAAAAAAQEAAAAAAAAAABMAAAAAAAEBAAAAAAAAAQIsAAAAAAABAQAAAAAAAAEBKAAAAAAAAQEAAAAAAAABBS0AAAAAAAEBAAAAAAAAAAAWAAAAAAABAQAAAAAAAAAAKAAAAAAAAQEAAAAAAAAAAB8AAAAAAAEBAAAAAAAAAABLAAAAAAABAQAAAAAAAAEBJAAAAAAAAQEAAAAAAAABBi0AAAAAAAEBAAAAAAAAAABWAAAAAAABAQAAAAAAAAAAIwAAAAAAAQEAAAAAAAAAAC8AAAAAAAEBAAAAAAAAAAAuAAAAAAABAQAAAAAAAAAABwAAAAAAAQEAAAAAAAAAAFUAAAAAAAEBAAAAAAAAAABQAAAAAAABAQAAAAAAAAAARwAAAAAAAQEAAAAAAAAAAEwAAAAAAAEBAAAAAAAAAAAsAAAAAAABAQAAAAAAAAEDJgAAAAAAAQEAAAAAAAABAyUAAAAAAH0AewBtZW1vcnkAY29uc3QAYXNzaWdubWVudABjb21tZW50AHN0YXRlbWVudABjb25zdGFudABzdGF0ZW1lbnRzAGRlY2xhcmF0aW9ucwBsb2dpY2FsX29wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AbWVtb3J5X2V4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdGF0ZW1lbnRfYmxvY2sAc3RyaW5nAHR5cGUAc2NvcGUAdmFyaWFibGVfbmFtZQBzb3VyY2VfZmlsZQB2YXJpYWJsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwA6AHN0YXRlbWVudHNfcmVwZWF0MQBkZWNsYXJhdGlvbnNfcmVwZWF0MQAvAC0ALAArACoAKQAoACEACgAAAAAAAAAAAAAADQAAADYAAAAAAAAAIgAAAAAAAABXAAAAAgAAAAEAAAAAAAAABwAAALAMAAAAAAAAwAgAAJANAACQFgAAAAAAAAAAAAAAAAAAIAoAANAKAAA8CwAAPgsAAFALAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAApRUAALgVAAD0FQAAmxQAAKkVAACSFAAAkBQAALUVAACyFQAA8hUAABUVAAC6FQAAthUAAPAVAADuFQAA7BUAAOQVAADqFQAA5hUAALAVAADoFQAArhUAAHcVAAC+FAAAqRUAAFoVAADwFAAAUhUAAOcUAADfFAAADhUAAHAVAACCFQAArBQAAJAVAADSFAAANBUAABoVAAAvFQAAxxQAALQUAABgFQAAfBUAAKEUAAAVFQAAnBUAAEcVAAAHFQAA+RQAAEAVAAAAFQAAlBQAAM8VAAC8FQAA'));
class L4Visitor extends L3Visitor {
    if(node) {
        this._emitter.number_of_if++;
        this._emitter.current_if.push(this._emitter.number_of_if);
        var guard_expression = this.visit(node.child(2));
        var has_else = this.has_else(node);
        this._emitter.start_if(guard_expression, has_else);
        this.visit(node.child(4));
        this._emitter.end_if(has_else)
        if (has_else) {
            this.visit(node.child(5))
        }
        this._emitter.current_if.pop();
    }

    else(node) {
        this._emitter.start_else();
        this.visit(node.child(1));
        this._emitter.end_else();
    }

    while(node) {
        this._emitter.number_of_while++;
        this._emitter.current_while.push(this._emitter.number_of_while);
        var guard_expression = this.visit(node.child(2));
        this._emitter.start_while();
        this.visit(node.child(4));
        this._emitter.end_while(guard_expression);
    }

    for(node) {
        this._emitter.number_of_for++;
        this._emitter.current_for.push(this._emitter.number_of_for);
        this._emitter.start_scope();
        this.visit(node.child(2));  // declare the variable used as accumulator
        this._emitter.start_for();
        this.visit(node.child(8));  // visit statements inside forloop

        var condition = this.visit(node.child(4));
        var acc_var_name = node.child(2).child(0).text;
        var acc_var_size = node.child(2).child(2).text;
        var incrementor = this.visit(node.child(6));
        this._emitter.end_for(condition, acc_var_name, acc_var_size, incrementor);
        this._emitter.end_scope();
    }

    has_else(node) {
        var has_else = false;
        node.children.forEach(c => {
            if (c.type === "else") {
                has_else = true;
            }
        })
        return has_else;
    }
}

class L4Emitter extends L3Emitter{
    start_if(guard_expression, has_else) {
        this.assignment(this.register('$?'), guard_expression, false, true);
        if (has_else) {
            this.goto(this.get_label(`#ELSE_${this.current_if.peek()}`))
        } else {
            this.goto(this.get_label(`#END_IF_${this.current_if.peek()}`))
        }
    }

    end_if(has_else) {
        if (has_else) {
            this.goto(this.get_label(`#END_IF_${this.current_if.peek()}`), false)
        } else {
            this.set_label(`#END_IF_${this.current_if.peek()}`)
        }
    }

    start_while() {
        this.goto(this.get_label(`#WHILE_GUARD_${this.current_while.peek()}`), false);
        this.set_label(`#WHILE_CONTENT_${this.current_while.peek()}`);   
    }

    end_while(guard_expression) {
        this.set_label(`#WHILE_GUARD_${this.current_while.peek()}`);
        this.assignment(this.register('$?'), guard_expression, false, false);
        this.goto(this.get_label(`#WHILE_CONTENT_${this.current_while.peek()}`))
    }

    start_for () {
        this.goto(this.get_label(`#FOR_GUARD_${this.current_for.peek()}`), false);
        this.set_label(`#FOR_CONTENT_${this.current_for.peek()}`);  
    }

    end_for(condition, var_name, var_size, expression) {
        this.set_label(`#FOR_GUARD_${this.current_for.peek()}`);
        this.variable(var_name, var_size, expression);
        this.assignment(this.register('$?'), condition, false, false);
        this.goto(this.get_label(`#FOR_CONTENT_${this.current_for.peek()}`));
    }

    start_else() {
        this.set_label(`#ELSE_${this.current_if.peek()}`)
    }

    end_else() {
        this.set_label(`#END_IF_${this.current_if.peek()}`)
    }

    number_of_if = 0;

    number_of_while = 0;

    number_of_for = 0;

    current_for= {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }

    current_while= {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }

    current_if = {
        items: [],
    
        push(element)
        {
            this.items.push(element);
        },
    
        pop()
        {
            if (this.items.length == 0)
                return "Underflow";
            return this.items.pop();
        },

        peek(){
            return this.items[this.items.length-1];
        }
    }
}

class L4Draw extends L3Draw {
    constructor(){
        super();
    }

    draw(vm) {
        super.draw(vm);
        return;
    }
}
encoded_levels.push(decode('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FwAVAAEAHgAXAAEAHwAZAAEAJAAOAAEALQA7AAEAOwA+AAEAOABSAAEALABdAAMAMwA0ADUAEQAEAC4ALwAwADIABABBAAEACgAMAAEAMQA9AAIAAAACAD8ADAAFAAgACQALAAwAEAAXAB0AHgAfACQAJQAHAEMAAQADAEYAAQAEAAkAAQA8AFcAAQAoAFYAAgApACoASwAEAAsAFwAdAB4ASQAGAAUACAAJABAAHwAkAAcAAwABAAMABQABAAQACQABADwAVwABACgAVgACACkAKgBPAAQACwAXAB0AHgBNAAYABQAIAAkAEAAfACQAAgBRAAIAAAACAFMADQAFAAgACQAKAAsADAAQABcAHQAeAB8AJAAlAAIAVQACAAAAAgBXAAwABQAIAAkACwAMABAAFwAdAB4AHwAkACUABABZAAEAAABbAAEAAgBfAAEAJQBdAAsABQAIAAkACwAMABAAFwAdAB4AHwAkAAQAHQABAAAAYQABAAIAZQABACUAYwALAAUACAAJAAsADAAQABcAHQAeAB8AJAACAGcAAgAAAAIAaQAMAAUACAAJAAsADAAQABcAHQAeAB8AJAAlAAQAawABAAAAbQABAAIAcQABACUAbwALAAUACAAJAAsADAAQABcAHQAeAB8AJAACAHMAAgAAAAIAdQAMAAUACAAJAAsADAAQABcAHQAeAB8AJAAlAAIAUQACAAAAAgBTAAwABQAIAAkACwAMABAAFwAdAB4AHwAkACUAAgB3AAIAAAACAHkADAAFAAgACQALAAwAEAAXAB0AHgAfACQAJQACAHsAAgAAAAIAfQAMAAUACAAJAAsADAAQABcAHQAeAB8AJAAlAAgAEQABABcAfwABAAYAgQABAA8AgwABABYAMAABADsAMQABADcARgABADYAhQAGABsAHAAdAB4AIgAkAAMAHQABAAAAYQABAAIAYwALAAUACAAJAAsADAAQABcAHQAeAB8AJAADAFkAAQAAAFsAAQACAF0ACwAFAAgACQALAAwAEAAXAB0AHgAfACQACAARAAEAFwB/AAEABgCDAAEAFgCHAAEADwAwAAEAOwAxAAEANwBYAAEANgCFAAYAGwAcAB0AHgAiACQAAwCJAAEAAACLAAEAAgCNAAsABQAIAAkACwAMABAAFwAdAB4AHwAkAAcAEQABABcAfwABAAYAgwABABYAMAABADsAMQABADcARwABADYAhQAGABsAHAAdAB4AIgAkAAcAEQABABcAfwABAAYAgwABABYAMAABADsAMQABADcAawABADYAhQAGABsAHAAdAB4AIgAkAAcAEQABABcAfwABAAYAgwABABYAMAABADsAMQABADcAaAABADYAhQAGABsAHAAdAB4AIgAkAAcAEQABABcAfwABAAYAgwABABYAMAABADsAMQABADcAaQABADYAhQAGABsAHAAdAB4AIgAkAAIAiQAGAAAACwAMABcAHQAeAI0ABgAFAAgACQAQAB8AJAAHABEAAQAXAH8AAQAGAIMAAQAWADAAAQA7ADEAAQA3AFMAAQA2AIUABgAbABwAHQAeACIAJAAHABEAAQAXAH8AAQAGAIMAAQAWADAAAQA7ADEAAQA3AE0AAQA2AIUABgAbABwAHQAeACIAJAACAJEABAALABcAHQAeAI8ACAADAAQABQAIAAkAEAAfACQABwARAAEAFwB/AAEABgCDAAEAFgAwAAEAOwAxAAEANwBcAAEANgCFAAYAGwAcAB0AHgAiACQAAgCTAAYAAAALAAwAFwAdAB4AlQAGAAUACAAJABAAHwAkAAIAWQAGAAAACwAMABcAHQAeAF0ABgAFAAgACQAQAB8AJAAHABEAAQAXAH8AAQAGAIMAAQAWADAAAQA7ADEAAQA3AGAAAQA2AIUABgAbABwAHQAeACIAJAACAB0ABgAAAAsADAAXAB0AHgBjAAYABQAIAAkAEAAfACQABwARAAEAFwB/AAEABgCDAAEAFgAwAAEAOwAxAAEANwBlAAEANgCFAAYAGwAcAB0AHgAiACQABwARAAEAFwB/AAEABgCDAAEAFgAwAAEAOwAxAAEANwBnAAEANgCFAAYAGwAcAB0AHgAiACQABwARAAEAFwB/AAEABgCDAAEAFgAwAAEAOwAxAAEANwBbAAEANgCFAAYAGwAcAB0AHgAiACQABQARAAEAFwCXAAEABgAwAAEAOwA9AAEANwCFAAYAGwAcAB0AHgAiACQABQARAAEAFwCZAAEABgAwAAEAOwA/AAEANwCFAAYAGwAcAB0AHgAiACQABQARAAEAFwCbAAEABgAwAAEAOwA1AAEANwCFAAYAGwAcAB0AHgAiACQABQARAAEAFwCdAAEABgAwAAEAOwA3AAEANwCFAAYAGwAcAB0AHgAiACQAAQCfAAkAAQAHAA0ADgATABQAFQAWACEABAARAAEAFwAwAAEAOwBBAAEANwCFAAYAGwAcAB0AHgAiACQAAQChAAcAAQAHABMAFAAVABYAIQADAKMAAgABAAcApwACABUAFgClAAMAEwAUACEAAwBDAAEAOgBIAAEAOQCpAAQAGwAcAB4AIgACAEoAAQA6AKkABAAbABwAHgAiAAIArQACABUAFgCrAAMAEwAUACEAAQCvAAIAAQAHAAIADQABAAsAEwABADIAAQCvAAIAAQAHAAEAsQACAB0AHgACALMAAQALAAgAAQAyAAEAtQACAAEABwABALcAAgANAA4AAgANAAEACwAPAAEAMgABALkAAgABAAcAAQC7AAIADQAOAAEAuQACAAEABwACAL0AAQAkAGoAAQA1AAEAvwACAAEABwACAA0AAQALABQAAQAyAAIAwQABABgAwwABACAAAQC1AAIAAQAHAAIAxQABABgAxwABACAAAQDJAAEAAQABAMsAAQAHAAEAwQABABgAAQDNAAEAGQABAM8AAQAYAAEA0QABAAEAAQDTAAEADAABANUAAQABAAEA1wABACMAAQDZAAEAIgABANsAAQABAAEA3QABAAEAAQDfAAEAAQABAOEAAQABAAEA4wABAAEAAQDlAAEAAAABAOcAAQABAAEA6QABAAEAAQDrAAEAAQABAO0AAQAAAAEA7wABABEAAQDxAAEABwABAPMAAQAHAAEA9QABAAEAAQD3AAEAGgABAPkAAQASAAEA+wABAAEAAQD9AAEAAAABAP8AAQACAAEAAQEBABsAAQADAQEAGgABAAUBAQAHAAEABwEBAAYAAQAJAQEABwABAAsBAQAHAAEADQEBAAcAAQAPAQEAAQABABEBAQAHAAEAEwEBAAYAAQAVAQEABgABABcBAQAMAAEAGQEBABwAAAAAAAAAPQAAAHoAAAC2AAAA8gAAAC4BAABhAQAAegEAAJkBAAC4AQAAzAEAAN8BAAD2AQAADQIAACACAAA3AgAASgIAAF0CAABwAgAAgwIAAKECAAC1AgAAyQIAAOcCAAD7AgAAFgMAADEDAABMAwAAZwMAAHgDAACTAwAArgMAAL8DAADaAwAA6wMAAPwDAAAXBAAAKAQAAEMEAABeBAAAeQQAAI4EAACjBAAAuAQAAM0EAADZBAAA6wQAAPUEAAADBQAAEAUAABoFAAAkBQAAKQUAADAFAAA1BQAAOgUAAEEFAABGBQAASwUAAFIFAABXBQAAXAUAAGEFAABoBQAAbQUAAHQFAAB7BQAAgAUAAIcFAACLBQAAjwUAAJMFAACXBQAAmwUAAJ8FAACjBQAApwUAAKsFAACvBQAAswUAALcFAAC7BQAAvwUAAMMFAADHBQAAywUAAM8FAADTBQAA1wUAANsFAADfBQAA4wUAAOcFAADrBQAA7wUAAPMFAAD3BQAA+wUAAP8FAAADBgAABwYAAAsGAAAPBgAAEwYAABcGAAAbBgAAHwYAACMGAAAnBgAAKwYAAAAAAAAAAAAAAAEAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAIQAiACMAJAAlACYAJwAoACkAKgArACwALQAuAC8AMAAxADIAMwA0ADUANgA3ADgAOQA6ADsAPAA9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAFQAAABUAAAAVAAAAFQAAABUAAAAVAAAAEwAAAAMAAAADAAAAEwAAABQAAAAUAAAAFAAAABQAAAAUAAAAFAAAABQAAAAUAAAAFAAAAAEAAAAUAAAAFAAAAAEAAAAUAAAAAQAAAAEAAAABAAAAAQAAABUAAAABAAAAAQAAAAMAAAABAAAAFQAAABUAAAABAAAAFQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAADAAAAAQAAAAMAAAADAAAAFQAAABUAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAwAAAAAAAAABAAAAAAAAAAAAAAAVAAAAAAAAABUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUAAAAAAAAAAAAAAAAAAAAMAAAAFQAAAAAAAAAAAAAAEwAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABUAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQABAAEAAQABAAEAAQABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAcAAAAAAAkACwAAAA0AAAAAAAAAAAAPAAAAAAAAAAAAAAAAABEAAAAAAAAAAAAAABMAFQAXAAAAAAAAAAAAGQAAAFkABQBXAFYAVgBVAFQAEAARABEAEQAAABEAXQBdAF0AAAAAAD4AAAAAADsACgACAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAAGMAAAAAAAEAAAAAAAAAAABvAAAAAAABAAAAAAAAAAAAbQAAAAAAAQAAAAAAAAAAAGwAAAAAAAEAAAAAAAAAAABmAAAAAAABAQAAAAAAAAAABgAAAAAAAQAAAAAAAAAAADgAAAAAAAEBAAAAAAAAAAAyAAAAAAABAQAAAAAAAAAABwAAAAAAAQEAAAAAAAAAADsAAAAAAAEAAAAAAAAAAABdAAAAAAABAAAAAAAAAAAAWgAAAAAAAQEAAAAAAAABASsAAAAAAAEBAAAAAAAAAQI9AAAAAAACAAAAAAAAAAECPQAAAAAAAABtAAABAAACAAAAAAAAAAECPQAAAAAAAABsAAABAAACAAAAAAAAAAECPQAAAAAAAABmAAABAAACAQAAAAAAAAECPQAAAAAAAAAGAAABAAACAAAAAAAAAAECPQAAAAAAAAA4AAABAAACAQAAAAAAAAECPQAAAAAAAAAyAAABAAACAQAAAAAAAAECPQAAAAAAAAAHAAABAAACAQAAAAAAAAECPQAAAAAAAAA7AAABAAACAAAAAAAAAAECPQAAAAAAAABdAAABAAACAAAAAAAAAAECPQAAAAAAAABaAAABAAABAQAAAAAAAAEFMAAAAAAAAQAAAAAAAAABBTAAAAAAAAEAAAAAAAAAAAA8AAAAAAACAAAAAAAAAAECPAAAAAAAAABjAAABAAACAAAAAAAAAAECPAAAAAAAAABvAAABAAABAAAAAAAAAAECPAAAAAAAAQEAAAAAAAABAjwAAAAAAAEAAAAAAAAAAQEnAAAAAAABAQAAAAAAAAEBJwAAAAAAAQEAAAAAAAABAzIAAAAAAAEAAAAAAAAAAQMyAAAAAAABAQAAAAAAAAEGMAAAAAAAAQAAAAAAAAABBjAAAAAAAAEBAAAAAAAAAQM9AAAAAAABAQAAAAAAAAAAHgAAAAAAAQAAAAAAAAABAz0AAAAAAAEAAAAAAAAAAAAZAAAAAAABAQAAAAAAAAAAJAAAAAAAAQAAAAAAAAABAj0AAAAAAAEAAAAAAAAAAAAXAAAAAAABAQAAAAAAAAECMQAAAAAAAQAAAAAAAAABAjEAAAAAAAEBAAAAAAAAAQE9AAAAAAABAQAAAAAAAAAAJgAAAAAAAQAAAAAAAAABAT0AAAAAAAEAAAAAAAAAAAAWAAAAAAABAQAAAAAAAAEBLQAAAAAAAQAAAAAAAAABAS0AAAAAAAEBAAAAAAAAAQkvAAAAAAABAAAAAAAAAAEJLwAAAAAAAQEAAAAAAAABBS4AAAAAAAEAAAAAAAAAAQUuAAAAAAABAQAAAAAAAAAAKQAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAAAvAAAAAAABAQAAAAAAAAAAMAAAAAAAAQEAAAAAAAAAACUAAAAAAAEBAAAAAAAAAQQ9AAAAAAABAQAAAAAAAAAAIwAAAAAAAQAAAAAAAAABBD0AAAAAAAEAAAAAAAAAAQM8AAAAAAABAQAAAAAAAAEDPAAAAAAAAQEAAAAAAAABBT0AAAAAAAEAAAAAAAAAAQU9AAAAAAABAQAAAAAAAAAAIgAAAAAAAQEAAAAAAAAAABoAAAAAAAEBAAAAAAAAAAAoAAAAAAABAQAAAAAAAAAAHAAAAAAAAQEAAAAAAAABBTsAAAAAAAEBAAAAAAAAAQE3AAAAAAABAQAAAAAAAAEBNgAAAAAAAQEAAAAAAAAAACsAAAAAAAEBAAAAAAAAAAAqAAAAAAABAQAAAAAAAAAARQAAAAAAAQEAAAAAAAAAACwAAAAAAAEBAAAAAAAAAAAtAAAAAAABAQAAAAAAAAEFNgAAAAAAAQEAAAAAAAAAAEsAAAAAAAEBAAAAAAAAAAAEAAAAAAABAQAAAAAAAAEHNgAAAAAAAQEAAAAAAAABATgAAAAAAAEBAAAAAAAAAQM2AAAAAAABAQAAAAAAAAAAFQAAAAAAAQEAAAAAAAAAAFoAAAAAAAEBAAAAAAAAAQI2AAAAAAABAQAAAAAAAAAAZAAAAAAAAQAAAAAAAAAAADMAAAAAAAEBAAAAAAAAAQE6AAAAAAABAAAAAAAAAAEBOgAAAAAAAQEAAAAAAAABAzMAAAAAAAEBAAAAAAAAAAA1AAAAAAABAQAAAAAAAAAALgAAAAAAAQEAAAAAAAABAzkAAAAAAAEBAAAAAAAAAQI0AAAAAAABAQAAAAAAAAAAEgAAAAAAAQEAAAAAAAABBDMAAAAAAAEBAAAAAAAAAABQAAAAAAABAQAAAAAAAAAAUQAAAAAAAQEAAAAAAAABAyoAAAAAAAEBAAAAAAAAAQMpAAAAAAABAQAAAAAAAAAADQAAAAAAAQEAAAAAAAAAACcAAAAAAAEBAAAAAAAAAAAOAAAAAAABAQAAAAAAAAEBJgAAAAAAAQEAAAAAAAABASgAAAAAAAEBAAAAAAAAAABiAAAAAAABAQAAAAAAAAEFNQAAAAAAAQEAAAAAAAACAAAAAAAAAAEBAAAAAAAAAABeAAAAAAABAQAAAAAAAAAANAAAAAAAAQEAAAAAAAAAADcAAAAAAAEBAAAAAAAAAQEsAAAAAAABAQAAAAAAAAAAXwAAAAAAAQEAAAAAAAAAABgAAAAAAAEBAAAAAAAAAQY1AAAAAAABAQAAAAAAAAECJgAAAAAAAQEAAAAAAAAAACEAAAAAAAEBAAAAAAAAAABPAAAAAAABAQAAAAAAAAAASQAAAAAAAQEAAAAAAAAAADYAAAAAAAEBAAAAAAAAAAAdAAAAAAABAQAAAAAAAAAARAAAAAAAAQEAAAAAAAAAADoAAAAAAAEBAAAAAAAAAAA5AAAAAAABAQAAAAAAAAAAHwAAAAAAAQEAAAAAAAAAAEIAAAAAAAEBAAAAAAAAAABAAAAAAAABAQAAAAAAAAAAGwAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAABOAAAAAAB9AHsAbWVtb3J5AGNvbnN0AGFzc2lnbm1lbnQAY29tbWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBkZWNsYXJhdGlvbnMAbG9naWNhbF9vcGVyYXRvcgBmb3IAcmVnaXN0ZXIAd3JpdGVyAG1lbW9yeV9yZWFkZXIAbnVtYmVyAGdvdG8AY29uc3RhbnRfZGVjbGFyYXRpb24AZGF0YV9kZWNsYXJhdGlvbgBtZW1vcnlfZXhwcmVzc2lvbgBzeXNjYWxsAGxhYmVsAHN0YXRlbWVudF9ibG9jawBzdHJpbmcAaWYAZWxzZQB0eXBlAHNjb3BlAHZhcmlhYmxlX25hbWUAd2hpbGUAc291cmNlX2ZpbGUAdmFyaWFibGUAZW5kAGRhdGEAXQBbAD89ADo9ADsAOgBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALwAtACwAKwAqACkAKAAhAAoADQAAAD4AAAAAAAAAJgAAAAAAAABwAAAAAgAAAAEAAAAAAAAACQAAAEARAAAAAAAAYAwAAEASAAAgHQAAAAAAAAAAAAAAAAAAIA4AAOAOAABcDwAAYA8AAIAPAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPxwAAFIcAACOHAAAIxsAAEMcAAAkHAAAihwAAIgcAAB4GwAAAxwAAAYcAAAaGwAAGBsAAE8cAABMHAAAjBwAAKEbAABUHAAAUBwAAIYcAAB+HAAAhBwAAIAcAABKHAAAghwAAEgcAAALHAAARhsAAEMcAADmGwAAfBsAAN4bAABvGwAAZxsAAJobAAD8GwAAFhwAADQbAAAqHAAAWhsAAMAbAACmGwAAuxsAAE8bAAA8GwAA7BsAACQcAAB4GwAAAxwAAAYcAAAQHAAAKRsAAKEbAAA2HAAA0xsAAJMbAACFGwAAzBsAAIwbAAAcGwAAaRwAAFYcAAA='));
for (var i = 0; i < encoded_levels.length; i++){
    var opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = "L"+i;
    document.getElementById('levels').appendChild(opt);
}
document.getElementById('levels').value = 4;

function get_visitor(level) {
  switch (level) {
        case 0:
            return new L0Visitor();
        case 1:
            return new L1Visitor();
        case 2:
            return new L2Visitor();
        case 3:
            return new L3Visitor();
        case 4:
            return new L4Visitor();
}
}
function get_drawer(level) {
  switch (level) {
        case 0:
            return new L0Draw();
        case 1:
            return new L1Draw();
        case 2:
            return new L2Draw();
        case 3:
            return new L3Draw();
        case 4:
            return new L4Draw();
}
}
function get_emitter(level) {
  switch (level) {
        case 0:
            return new L0Emitter();
        case 1:
            return new L1Emitter();
        case 2:
            return new L2Emitter();
        case 3:
            return new L3Emitter();
        case 4:
            return new L4Emitter();
}
}