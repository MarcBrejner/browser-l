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
        //if (node.type === "statement") this._emitter.node_stack.push(node);
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

    register(register_id) {;
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
          var res = `<span id=line-number>${i} </span>` + instructions[i].handle(this) + this.print_label(i) +`<br>`;
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
        pretty_window.innerHTML = pretty_source_code;
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
        }else if(content.type == CONTENT_TYPES.MEMORY){
          return this.print_memory(content);
        }else{
          return `${content.id}`
        }
      }
    
      print_memory(content) {
        if (content.id.type === CONTENT_TYPES.BIN_EXPRESSION) {
          return `[${content.id.reader1.get_text()} ${content.id.opr} ${content.id.reader2.get_text()},${content.datatype.type}${content.datatype.size}]`
        }
        else {
          return `[${content.get_text()},${content.datatype.type}${content.datatype.size}]`
        }
      }
    
      print_label(i){
        var [exists, label_key] = getKeyByValueIfValueExists(this.program.labels, i);
        var result = exists ? `${this.wrap_label(label_key)}` : "";
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
encoded_levels.push(decode('AGFzbQEAAAAADQZkeWxpbmuYGwQBAAABHAZgAX8AYAAAYAABf2ACf38Bf2ABfwF/YAJ/fwACWgQDZW52DV9fbWVtb3J5X2Jhc2UDfwADZW52DF9fdGFibGVfYmFzZQN/AANlbnYGbWVtb3J5AgABA2VudhlfX2luZGlyZWN0X2Z1bmN0aW9uX3RhYmxlAXAAAQMFBAEBAgMGBgF/AEEACwdQBBFfX3dhc21fY2FsbF9jdG9ycwAADnRyZWVfc2l0dGVyX0wwAAIMX19kc29faGFuZGxlAwIYX193YXNtX2FwcGx5X2RhdGFfcmVsb2NzAAEJBwEAIwELAQMK6hYEBAAQAQvZBQAjAEGYGWojAEGQC2o2AgAjAEGcGWojADYCACMAQaAZaiMAQeAHajYCACMAQaQZaiMAQbAMajYCACMAQagZaiMAQYAaajYCACMAQbgZaiMAQbAJajYCACMAQbwZaiMAQbAKajYCACMAQcAZaiMAQfwKajYCACMAQcQZaiMAQf4KajYCACMAQcgZaiMAQaAXajYCACMAQcwZaiMBNgIAIwBBgBpqIwBBzxZqNgIAIwBBhBpqIwBB4hZqNgIAIwBBiBpqIwBBkhdqNgIAIwBBjBpqIwBB/xRqNgIAIwBBkBpqIwBB0xZqNgIAIwBBlBpqIwBB3xZqNgIAIwBBmBpqIwBB3BZqNgIAIwBBnBpqIwBBkBdqNgIAIwBBoBpqIwBBjBdqNgIAIwBBpBpqIwBB2hZqNgIAIwBBqBpqIwBBjhdqNgIAIwBBrBpqIwBB2BZqNgIAIwBBsBpqIwBBvhZqNgIAIwBBtBpqIwBBohVqNgIAIwBBuBpqIwBB0xZqNgIAIwBBvBpqIwBBsRZqNgIAIwBBwBpqIwBBzBVqNgIAIwBBxBpqIwBBqRZqNgIAIwBByBpqIwBBwxVqNgIAIwBBzBpqIwBB6hVqNgIAIwBB0BpqIwBBtxZqNgIAIwBB1BpqIwBBkBVqNgIAIwBB2BpqIwBBwxZqNgIAIwBB3BpqIwBBthVqNgIAIwBB4BpqIwBBixZqNgIAIwBB5BpqIwBB8RVqNgIAIwBB6BpqIwBBhhZqNgIAIwBB7BpqIwBBqxVqNgIAIwBB8BpqIwBBmBVqNgIAIwBB9BpqIwBBhRVqNgIAIwBB+BpqIwBBnhZqNgIAIwBB/BpqIwBB4xVqNgIAIwBBgBtqIwBB1RVqNgIAIwBBhBtqIwBBlxZqNgIAIwBBiBtqIwBB3BVqNgIAIwBBjBtqIwBB+BRqNgIAIwBBkBtqIwBB9xZqNgIAIwBBlBtqIwBB5BZqNgIACwgAIwBB8BhqC/4QAQV/A0AgACgCACECQQMhAyAAIAAoAhgRBAAhBkEAIQQCQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQAJAAkACQCABQf//A3EONgABAgMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR85OiU7JicoKSorLC0uLzAxMjM0NTY3OEYLQQAhA0EfIQEgBg1KAkACQAJAAkACQAJAAkACQAJAAkACQCACQTlMBEBBJiEBAkACQCACQSBrDhABWAMtLg0EDQ0NDQ0FBg0vAAtBASACdEGAzABxRSACQQ1Lcg0MC0EBIQNBACEBDFYLAkAgAkHbAGsODy4LBwsLCwsLCAkLCgsLCgALAkAgAkE6aw4HBU0LCwtOBgALIAJB8wBrDgMuCgkKC0EdIQEMVAtBGiEBDFMLQSkhAQxSC0EnIQEMUQtBCSEBDFALQRshAQxPC0ErIQEMTgtBEiEBDE0LQQshAQxMC0EEIQEMSwtBMyEBIAUhBCACQTBrQQpJDUoMRQtBACEDQTQhASACQSJGDUkgAkUNQyACQQpHDRwMQwtBACEDAkAgAkEfTARAIAJBCWtBAkkNSSACQQ1HDQEMSQsgAkEgRg1IIAJBJkYNR0EqIQEgAkEsRg1JCyACQSprQQZJIAJBPGtBA0lyDUYgAkH8AEcNQgxGCyACQS9HDUFBACEDQRwhAQxHC0EHIQFBACEDIAUhBAJAAkAgAkExaw4ISEMAQ0MBQ0VDC0EFIQEMRwtBBiEBDEYLIAJBMkcNPwxBCyACQTRGDUAMPgsgAkE2Rg0/DD0LQQAhAyACQQlrIgFBHUsNOEEBIAF0QZOAgARxBEBBCCEBQQEhAwxDCyABQR1GDUAMOAsgAkE9Rw07QQAhA0EkIQEMQQsgAkE9Rw06QQAhA0ElIQEMQAsgAkHhAEcNOUEAIQNBFiEBDD8LIAJB4QBHDThBACEDQSMhAQw+CyACQeEARw03QQAhA0EQIQEMPQsgAkHjAEcNNkEAIQNBDSEBDDwLIAJB7ABHDTVBACEDQTEhAQw7CyACQewARw00QQAhA0EPIQEMOgsgAkHuAEcNM0EAIQNBFCEBDDkLIAJB7wBHDTJBACEDQREhAQw4CyACQfMARw0xQQAhA0EOIQEMNwsgAkHzAEcNMEEAIQNBFSEBDDYLIAJB9ABHDS9BACEDQSIhAQw1CyACQfQARw0uQQAhA0EMIQEMNAsgAkH5AEcNLUEAIQNBEyEBDDMLQQAhA0EwIQEgAkHpAGsiBEEQSw0nQQEgBHRBv4AGcQ0yDCcLIAJBwQBrQRpPDSsMJQtBACEDQS4hASACQd8ARg0wIAUhBCACQV9xQcEAa0EaSQ0wDCsLQQAhA0EtIQEgAkHfAEYNLyAFIQQgAkFfcUHBAGtBGkkNLwwqC0EAIQNBNSEBIAJBIEYgAkHBAGtBGklyIAJBMGtBCklyDS4gBSEEIAJB4QBrQRpJDS4MKQsgAkUgAkEKRnINJ0EAIQMLQQEhAQwsC0EAIQNBHyEBIAYNKwJAAkAgAkEfTARAQSEhASAFIQQgAkEJaw4FAS4pKQEpCyACQS5KDQEgBSEEIAJBIGsOBQAoKAIDKAtBASEDQR4hAQwsCyACQS9GDQIgAkHbAEYNAyACQfMARg0EDCULQRkhAQwqC0EYIQEMKQtBAyEBDCgLQSghAQwnC0EXIQEMJgsgAEECOwEEIAAgACgCDBEAAEEBIQUgAkEKRw0WQQAhA0EhIQEMJQtBBCEDDBQLQQUhAwwTC0EGIQMMEgtBByEDDBELQQghAwwQC0EJIQMMDwtBCiEDDA4LIABBCjsBBCAAIAAoAgwRAABBACEDQTIhAUEBIQUgAkEmayIEQRhLDRBBASAEdEHxh4AOcQ0dDBALQQshAwwMC0EMIQMMCwsgAEENOwEEIAAgACgCDBEAAEEAIQNBASEFQS0hASACQd8ARg0aQQEhBCACQV9xQcEAa0EaSQ0aDBULIABBDjsBBCAAIAAoAgwRAABBACEDQQEhBUEuIQEgAkHfAEYNGUEBIQQgAkFfcUHBAGtBGkkNGQwUCyAAQQ87AQQgACAAKAIMEQAAQQEhBSACQcEAa0EaSQ0MDAkLQRAhAwwHC0ERIQMMBgsgAEESOwEEIAAgACgCDBEAAEEAIQNBMiEBQQEhBSACQSZrIgRBGEsNB0EBIAR0QfGHgA5xDRUMBwsgAEETOwEEIAAgACgCDBEAAEEBIQUgAkEwa0EKTw0FQQAhA0EzIQEMFAsgAEEUOwEEIAAgACgCDBEAAEEAIQNBASEEQTQhASACQSJHBEAgAkUgAkEKRnIND0EBIQELQQEhBQwTCyAAQRU7AQQgACAAKAIMEQAAQQAhA0EBIQVBNSEBIAJBIEYgAkHBAGtBGklyIAJBMGtBCklyDRJBASEEIAJB4QBrQRpJDRIMDQtBACEDDAELQQEhAwsgACADOwEEIAAgACgCDBEAAAtBASEEDAkLQQEhBCACQfwARg0NDAgLQQEhBCACQfwARg0MDAcLQQAhA0EvIQEMCwsgAkEhayICQR5LDQQgBSEEQQEgAnRBgZCAgARxDQoMBQtBCSEBIAJBOmsOBgkAAgICAQILQSAhAQwIC0EKIQEMBwsgAkEqa0EGSSACQTxrQQNJciACQfwARnINBAsgBSEECyAEQQFxDwtBACEDC0EsIQEMAgtBMiEBDAELQQEhA0ECIQELIAAgAyAAKAIIEQUADAALAAsLnxsBACMAC5gbBwAHAAEACQAPAAEABwARAAEACAAXAAEAIwAaAAEAHwAeAAEAHgATAAUADQAOAA8AEAATAAYAAwABAAMABQABAAQACAABACQALAABABgAJwACABkAGgAVAAQACQAPABAAEQAKAAcAAQAJAAkAAQAPAAsAAQAQAA0AAQARAAYAAQAlABkAAQAjABsAAQAgACUAAQAcACYAAQAbADAAAQAdAAYABwABAAkAEQABAAgAFwABACMAGgABAB8ALgABAB4AEwAFAA0ADgAPABAAEwAKAAcAAQAJAAkAAQAPAAsAAQAQAA0AAQARABcAAQAAAAcAAQAlABkAAQAjABsAAQAgACUAAQAcADAAAQAdAAoAGQABAAAAGwABAAkAHgABAA8AIQABABAAJAABABEABwABACUAGQABACMAGwABACAAJQABABwAMAABAB0ABgAnAAEAAwAqAAEABAAIAAEAJAAsAAEAGAAnAAIAGQAaAC0ABAAJAA8AEAARAAQABwABAAkAFwABACMAMwABAB8AEwAFAA0ADgAPABAAEwAEAAcAAQAJABcAAQAjAC8AAQAfABMABQANAA4ADwAQABMABwAHAAEACQALAAEAEAANAAEAEQAZAAEAIwAbAAEAIAAoAAEAHAAwAAEAHQAEABkAAQAAAC8AAQACADMAAQAVADEABAAJAA8AEAARAAQANQABAAAANwABAAIAOwABABUAOQAEAAkADwAQABEAAwAcAAEAIgAiAAEAIQA9AAQADQAOABAAEwADAD8AAQAAAEEAAQACAEMABAAJAA8AEAARAAMANQABAAAANwABAAIAOQAEAAkADwAQABEAAQBFAAYAAwAEAAkADwAQABEAAQA/AAUAAAAJAA8AEAARAAEANQAFAAAACQAPABAAEQACACsAAQAiAD0ABAANAA4AEAATAAEARwAFAAAACQAPABAAEQABAEkABAABAAUABgASAAEASwACAAEAEgABAE0AAgAKABIAAQBPAAIABQAGAAIAUQABAAEAUwABABIAAQBVAAIABQAGAAIAVwABAAoAWQABABIAAQBbAAEAAAABAF0AAQABAAEAXwABAAEAAQBhAAEAAQABAGMAAQAMAAEAZQABAAoAAQBnAAEAFAABAGkAAQATAAEAawABAAEAAQBtAAEAAAABAG8AAQABAAEAcQABAAEAAQBzAAEAAgABAHUAAQALAAEAdwABAAoAAQB5AAEAAQABAHsAAQAAAAEAfQABAAEAAQB/AAEAAQABAIEAAQABAAEAgwABAA0AAQCFAAEADgABAIcAAQABAAAAAAAAAAAAAAAAAAAAGgAAADEAAABQAAAAZwAAAIYAAAClAAAAvAAAAM0AAADeAAAA9AAAAAQBAAAUAQAAIQEAAC4BAAA7AQAARAEAAEwBAABUAQAAXgEAAGYBAABtAQAAcgEAAHcBAAB8AQAAgwEAAIgBAACPAQAAkwEAAJcBAACbAQAAnwEAAKMBAACnAQAAqwEAAK8BAACzAQAAtwEAALsBAAC/AQAAwwEAAMcBAADLAQAAzwEAANMBAADXAQAA2wEAAN8BAADjAQAA5wEAAAAAAAAAAAAAAAEAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIAIwAkACUAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAAAAAABwAAAAAAAAAAAAAACQALAA0AAAAAAAAAAAAtAAQALAAnACcAHQAlADAAAAAAABsAAAAAABkAAwAGAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQEAAAAAAAAAADEAAAAAAAEBAAAAAAAAAAAyAAAAAAABAQAAAAAAAAAADgAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAAAZAAAAAAABAQAAAAAAAAAAMAAAAAAAAQEAAAAAAAAAAAUAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAAAFwAAAAAAAQEAAAAAAAABARcAAAAAAAEBAAAAAAAAAQEbAAAAAAABAQAAAAAAAAECJQAAAAAAAgEAAAAAAAABAiUAAAAAAAAADgAAAQAAAgEAAAAAAAABAiUAAAAAAAAACwAAAQAAAgEAAAAAAAABAiUAAAAAAAAAGQAAAQAAAgEAAAAAAAABAiUAAAAAAAAAMAAAAQAAAgEAAAAAAAABAiQAAAAAAAAAMQAAAQAAAgEAAAAAAAABAiQAAAAAAAAAMgAAAQAAAQEAAAAAAAABAiQAAAAAAAEBAAAAAAAAAAATAAAAAAABAAAAAAAAAAECJQAAAAAAAQAAAAAAAAAAABAAAAAAAAEBAAAAAAAAAQMlAAAAAAABAQAAAAAAAAAAEgAAAAAAAQAAAAAAAAABAyUAAAAAAAEAAAAAAAAAAAAPAAAAAAABAQAAAAAAAAAAGAAAAAAAAQEAAAAAAAABBCUAAAAAAAEBAAAAAAAAAAAVAAAAAAABAAAAAAAAAAEEJQAAAAAAAQEAAAAAAAABAyQAAAAAAAEBAAAAAAAAAQUlAAAAAAABAQAAAAAAAAEFIwAAAAAAAQEAAAAAAAABAR8AAAAAAAEAAAAAAAAAAQEiAAAAAAABAQAAAAAAAAEBIAAAAAAAAQEAAAAAAAABAR4AAAAAAAEBAAAAAAAAAAAJAAAAAAABAQAAAAAAAAAAAgAAAAAAAQAAAAAAAAAAACEAAAAAAAEAAAAAAAAAAAAUAAAAAAABAQAAAAAAAAEBFgAAAAAAAQEAAAAAAAABAx0AAAAAAAEBAAAAAAAAAQMZAAAAAAABAQAAAAAAAAEDGgAAAAAAAQEAAAAAAAAAACoAAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAAAIAAAAAAAAQEAAAAAAAAAAB8AAAAAAAEBAAAAAAAAAAAMAAAAAAABAQAAAAAAAAECFgAAAAAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAAAEQAAAAAAAQEAAAAAAAAAABYAAAAAAAEBAAAAAAAAAQMhAAAAAAABAQAAAAAAAAAAKQAAAAAAAQEAAAAAAAACAAAAAAAAAAEBAAAAAAAAAQQdAAAAAAABAQAAAAAAAAECHgAAAAAAAQEAAAAAAAABARwAAAAAAAEBAAAAAAAAAAAkAAAAAAABAQAAAAAAAAAAIwAAAAAAAQEAAAAAAAABAx4AAAAAAG1lbW9yeQBjb25zdABhc3NpZ25tZW50AGNvbW1lbnQAc3RhdGVtZW50AGNvbnN0YW50AHN0YXRlbWVudHMAZGVjbGFyYXRpb25zAG9wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAG1lbW9yeV9leHByZXNzaW9uAHN5c2NhbGwAbGFiZWwAc3RyaW5nAHR5cGUAc291cmNlX2ZpbGUAZW5kAGRhdGEAXQBbAD89ADo9ADsAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxAC0ALAAhAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHgAAAB4AAAAAAAAAHgAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAIAAAAAgAAAAAAAAAIAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0AAAAmAAAAAAAAABYAAAAAAAAANAAAAAIAAAABAAAAAAAAAAUAAACQBQAAAAAAAOADAAAwBgAAAA0AAAAAAAAAAAAAAAAAALAEAAAwBQAAfAUAAH4FAACgCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE8LAABiCwAAkgsAAH8KAABTCwAAXwsAAFwLAACQCwAAjAsAAFoLAACOCwAAWAsAAD4LAACiCgAAUwsAADELAADMCgAAKQsAAMMKAADqCgAANwsAAJAKAABDCwAAtgoAAAsLAADxCgAABgsAAKsKAACYCgAAhQoAAB4LAADjCgAA1QoAABcLAADcCgAAeAoAAHcLAABkCwAA'));
class L1Visitor extends L0Visitor {  
    goto(node) {
        var reader = node.child(1);
        var pos = this.visit(reader);
        this._emitter.goto(pos)
    }
}

class L1Emitter extends L0Emitter{
    goto(pos){
        this.assignment(
            this.register('$!'), 
            this.binary_expression(pos, '-', this.number(1)),
            true);
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
encoded_levels.push(decode('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ABIACAAHAAEABwAJAAEACAANAAEADwAPAAEAEAAWAAEAIwAbAAEAIAAkAAEAGwAxAAIAHAAdAAQAEwABAAAAMgABAAIANgABABQANAAFAAcACAAOAA8AEAAEAAkAAQAIABkAAQAjADMAAQAfAC4ABQAMAA0ADgAPABIABAAJAAEACAAZAAEAIwAvAAEAHwAuAAUADAANAA4ADwASAAQAOAABAAAAOgABAAIAPgABABQAPAAFAAcACAAOAA8AEAADAEAAAQAAAEIAAQACAEQABQAHAAgADgAPABAAAwA4AAEAAAA6AAEAAgA8AAUABwAIAA4ADwAQAAEARgAHAAMABAAHAAgADgAPABAAAQBIAAYAAAAHAAgADgAPABAAAQBAAAYAAAAHAAgADgAPABAAAwAXAAEAIgAlAAEAIQBKAAQADAANAA8AEgABADgABgAAAAcACAAOAA8AEAACACwAAQAiAEoABAAMAA0ADwASAAEATAAEAAEABQAGABEAAQBOAAIABQAGAAIAUAABAAkAUgABABEAAQBUAAIACQARAAEAVgACAAEAEQABAFgAAgAOAA8AAQBaAAIABQAGAAIAXAABAAEAXgABABEAAQBgAAEAAAABAGIAAQACAAEAZAABAAEAAQBmAAEAAQABAGgAAQALAAEAagABAAwAAQBsAAEAAAABAG4AAQABAAEAcAABAAkAAQByAAEAAQABAHQAAQATAAEAdgABABIAAQB4AAEAAQABAHoAAQABAAEAfAABAAoAAQB+AAEACQABAIAAAQABAAEAggABAAEAAQCEAAEAAQABAIYAAQAAAAEAiAABAAEAAQCKAAEADQABAIwAAQABAAAAAAAjAAAARgAAAGkAAACBAAAAmQAAALAAAADKAAAA2wAAAOwAAAD9AAAADgEAABwBAAAqAQAANAEAAD0BAABGAQAAUwEAAFwBAABmAQAAbQEAAHIBAAB5AQAAfgEAAIMBAACIAQAAjQEAAJQBAACYAQAAnAEAAKABAACkAQAAqAEAAKwBAACwAQAAtAEAALgBAAC8AQAAwAEAAMQBAADIAQAAzAEAANABAADUAQAA2AEAANwBAADgAQAA5AEAAOgBAADsAQAAAAAAAAAAAAAAAQABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAQABAQABAQABAQABAQAB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'));
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
            return this.read_temp_var(var_name);
        } else {
            var p_var = '&_' + var_name;
            return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
        }
    }

    create_temp_var(var_name, var_size, expression, has_not) {
        var variable_size = get_variable_bytesize(var_size);
        this.frame_pointer -= variable_size;
        this.head.variables[var_name] = [this.stack_pointer - this.frame_pointer, var_size];
        var writer = this.read_temp_var(var_name);
        this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), structuredClone(this.head)];
        this.assignment(writer, expression, false, has_not);
    }

    read_temp_var(var_name) {
        var current = this.head;
        while (current != null) {
            if (var_name in current.variables) {
                return this.memory(this.binary_expression(this.register('$fp'), '-', this.number(current.variables[var_name][0])), get_datatype(current.variables[var_name][1]))
            }   
            current = current.next;
        }
        // TODO: check if node.text is in variable dict otherwise return error
        var p_var = '&_' + var_name;
        return this.memory(this.data(p_var), get_datatype(this.variables[p_var]));
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

    variable_declaration(var_name, var_size, expression, has_not) {
        var p_var = '&_' + var_name;
        this.variables[p_var] = var_size;
        var memory_allocation = "";

        for (var i = 0; i < get_variable_bytesize(var_size); i++) {
            memory_allocation += "0";
        }

        this._data[p_var] = memory_allocation;
        this._drawer.variable_states[this._statements.length] = [structuredClone(this.variables), null];
        this.assignment(
            this.memory(this.data(p_var), get_datatype(var_size)), 
            expression, false, has_not);
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

    set_state() {

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

        var existingContainer = document.getElementById("table-wrapper-container");
        if (existingContainer) {
          container.removeChild(existingContainer);
        }

        
        var state = this.find_state(this.variable_states, vm.state.registers['$!']-1)
        if(state === null){
            return;
        }
        var wrapperContainer = document.createElement("div");
        wrapperContainer.id = "table-wrapper-container";

        

        var variables = state[0]
        this.create_wrapper(variables, vm, wrapperContainer)
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
      

}
encoded_levels.push(decode('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C0ErIQMMAwtBASEEQQIhAwwCC0EtIQMMAQtBFCEDCyAAIAQgACgCCBEFAAwACwALC7shAQAjAAu0IQ0AFwABAAUAGgABAAkAHQABAAwAIAABABIAIwABABMAJgABABQAKQABABgAAgABACwAGQABACcAHAABACoAMAABACAAFQACAAAABgA4AAQAIQAiACMAJAANAAcAAQAFAAkAAQAJAAsAAQAMAA0AAQASAA8AAQATABEAAQAUABMAAQAYAAIAAQAsABkAAQAnABwAAQAqADAAAQAgACwAAgAAAAYAOAAEACEAIgAjACQADQAHAAEABQAJAAEACQALAAEADAANAAEAEgAPAAEAEwARAAEAFAATAAEAGAADAAEALAAZAAEAJwAcAAEAKgAsAAEAHwAwAAEAIAA4AAQAIQAiACMAJAANAAcAAQAFAAkAAQAJAAsAAQAMAA0AAQASAA8AAQATABEAAQAUABMAAQAYAAMAAQAsABkAAQAnABwAAQAqACIAAQAfADAAAQAgADgABAAhACIAIwAkAAcALgABAAMAMQABAAQABgABACsANAABABwAMwACAB0AHgA2AAMACQAUABgANAAEAAUADAASABMACgAHAAEABQAJAAEACQALAAEADAAPAAEAEwARAAEAFAATAAEAGAAZAAEAJwAcAAEAKgAoAAEAIAA4AAQAIQAiACMAJAAHAAMAAQADAAUAAQAEAAYAAQArADQAAQAcADMAAgAdAB4AOgADAAkAFAAYADgABAAFAAwAEgATAAQAFQABAAAAPAABAAIAQAABABkAPgAIAAUABgAJAAwAEgATABQAGAAEAEIAAQAAAEQAAQACAEgAAQAZAEYACAAFAAYACQAMABIAEwAUABgABgALAAEADABMAAEAFQAYAAEAJgAaAAEAKgAvAAEAJQBKAAYAEAARABIAEwAWABgABgALAAEADABMAAEAFQAYAAEAJgAaAAEAKgA6AAEAJQBKAAYAEAARABIAEwAWABgAAwBCAAEAAABEAAEAAgBGAAgABQAGAAkADAASABMAFAAYAAMATgABAAAAUAABAAIAUgAIAAUABgAJAAwAEgATABQAGAACAFIAAwAJABQAGABOAAYAAAAFAAYADAASABMABAALAAEADAAaAAEAKgA2AAEAJgBKAAYAEAARABIAEwAWABgAAgBWAAMA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IQAAAQAAAgAAAAAAAAABAisAAAAAAAAAOQAAAQAAAQEAAAAAAAABAisAAAAAAAEAAAAAAAAAAQIrAAAAAAABAQAAAAAAAAEBGwAAAAAAAQAAAAAAAAABARsAAAAAAAEBAAAAAAAAAAATAAAAAAABAAAAAAAAAAECLAAAAAAAAQAAAAAAAAAAAA0AAAAAAAEBAAAAAAAAAQMsAAAAAAABAQAAAAAAAAAADwAAAAAAAQAAAAAAAAABAywAAAAAAAEAAAAAAAAAAAAOAAAAAAABAQAAAAAAAAAAGgAAAAAAAQAAAAAAAAAAABAAAAAAAAEBAAAAAAAAAQQsAAAAAAABAQAAAAAAAAAAEQAAAAAAAQAAAAAAAAABBCwAAAAAAAEBAAAAAAAAAQUsAAAAAAABAAAAAAAAAAEFLAAAAAAAAQAAAAAAAAABAysAAAAAAAEBAAAAAAAAAQMrAAAAAAABAQAAAAAAAAAAGwAAAAAAAQEAAAAAAAABBSoAAAAAAAEBAAAAAAAAAQElAAAAAAABAQAAAAAAAAAAEgAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAQEmAAAAAAABAAAAAAAAAAEBKQAAAAAAAQEAAAAAAAABAScAAAAAAAEAAAAAAAAAAAAmAAAAAAABAAAAAAAAAAAAFgAAAAAAAQEAAAAAAAAAACsAAAAAAAEBAAAAAAAAAQEaAAAAAAABAQAAAAAAAAAAFAAAAAAAAQEAAAAAAAAAAC4AAAAAAAEBAAAAAAAAAQIaAAAAAAABAQAAAAAAAAEDHQAAAAAAAQEAAAAAAAABAx4AAAAAAAEBAAAAAAAAAQMhAAAAAAABAQAAAAAAAAAAMQAAAAAAAQEAAAAAAAAAACkAAAAAAAEBAAAAAAAAAAAKAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAAAACYAAAAAAAEBAAAAAAAAAQIjAAAAAAABAQAAAAAAAAAAJQAAAAAAAQEAAAAAAAAAACQAAAAAAAEBAAAAAAAAAAAjAAAAAAABAQAAAAAAAAEDIgAAAAAAAQEAAAAAAAAAAAkAAAAAAAEBAAAAAAAAAAAXAAAAAAABAQAAAAAAAAEDKAAAAAAAAQEAAAAAAAABARwAAAAAAAEBAAAAAAAAAAAgAAAAAAABAQAAAAAAAAIAAAAAAAAAAQEAAAAAAAABAiUAAAAAAAEBAAAAAAAAAAAnAAAAAAABAQAAAAAAAAEBIAAAAAAAAQEAAAAAAAAAAC0AAAAAAAEBAAAAAAAAAQUkAAAAAAABAQAAAAAAAAEDJQAAAAAAfQB7AG1lbW9yeQBjb25zdABhc3NpZ25tZW50AGNvbW1lbnQAc3RhdGVtZW50AGNvbnN0YW50AHN0YXRlbWVudHMAZGVjbGFyYXRpb25zAG9wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AbWVtb3J5X2V4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdHJpbmcAdHlwZQBzY29wZQB2YXJpYWJsZV9uYW1lAHNvdXJjZV9maWxlAHZhcmlhYmxlAGVuZABkYXRhAF0AWwA/PQA6PQA7ADoAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxACwACgANAAAALQAAAAAAAAAaAAAAAAAAADwAAAACAAAAAQAAAAAAAAAFAAAAEAgAAAAAAAAwBQAA0AgAAAAQAAAAAAAAAAAAAAAAAAAgBgAAsAYAAAoHAAAMBwAAIAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtDwAAQA8AAG4PAAA7DgAAMQ8AADIOAAAwDgAAPQ8AADoPAACtDgAAQg8AAD4PAAA4DwAAbA8AADYPAAD/DgAAXg4AADEPAADyDgAAiA4AAOoOAAB/DgAApg4AAPgOAAAKDwAATA4AABgPAAByDgAAzA4AALIOAADHDgAAZw4AAFQOAAAEDwAAQQ4AAK0OAAAkDwAA3w4AAJ8OAACRDgAA2A4AAJgOAAA0DgAAVw8AAEQPAAA='));
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
            return this.read_temp_var(`${this.frame_pointer}`);
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
encoded_levels.push(decode('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IAQgACgCCBEFAAwACwALC8crAQAjAAvAKw0AFwABAAUAGgABAAoAHQABABMAIAABABkAIwABABoAJgABABsAKQABAB8AAgABADMAKAABAC4ALQABADEATAABACcAFQACAAAABgBHAAQAKAApACoAKwANAAcAAQAFAAkAAQAKAAsAAQATAA0AAQAZAA8AAQAaABEAAQAbABMAAQAfAAIAAQAzACgAAQAuAC0AAQAxAEwAAQAnACwAAgAAAAYARwAEACgAKQAqACsADQAHAAEABQAJAAEACgALAAEAEwANAAEAGQAPAAEAGgARAAEAGwATAAEAHwADAAEAMwAoAAEALgAtAAEAMQA3AAEAJgBMAAEAJwBHAAQAKAApACoAKwANAAcAAQAFAAkAAQAKAAsAAQATAA0AAQAZAA8AAQAaABEAAQAbABMAAQAfAAMAAQAzACgAAQAuAC0AAQAxADEAAQAmAEwAAQAnAEcABAAoACkAKgArAAcALgABAAMAMQABAAQABgABADIAPwABACMAPgACACQAJQA2AAMACgAbAB8ANAAEAAUAEwAZABoACgAHAAEABQAJAAEACgALAAEAEwAPAAEAGgARAAEAGwATAAEAHwAoAAEALgAtAAEAMQBDAAEAJwBHAAQAKAApACoAKwAIAAsAAQATADgAAQAJADoAAQANADwAAQASACAAAQAtACEAAQAxADMAAQAsAD4ABgAXABgAGQAaAB0AHwAIAAsAAQATADoAAQANADwAAQASAEAAAQAJACAAAQAtACEAAQAxAEAAAQAsAD4ABgAXABgAGQAaAB0AHwAHAAMAAQADAAUAAQAEAAYAAQAyAD8AAQAjAD4AAgAkACUARAADAAoAGwAfAEIABAAFABMAGQAaAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEAOwABACwAPgAGABcAGAAZABoAHQAfAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEAUAABACwAPgAGABcAGAAZABoAHQAfAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEATwABACwAPgAGABcAGAAZABoAHQAfAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEASgABACwAPgAGABcAGAAZABoAHQAfAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEASQABACwAPgAGABcAGAAZABoAHQAfAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEARgABACwAPgAGABcAGAAZABoAHQAfAAcACwABABMAOgABAA0APAABABIAIAABAC0AIQABADEAOgABACwAPgAGABcAGAAZABoAHQAfAAQAFQABAAAARgABAAIASgABACAASAAIAAUABgAKABMAGQAaABsAHwAEAEwAAQAAAE4AAQACAFIAAQAgAFAACAAFAAYACgATABkAGgAbAB8ABQALAAEAEwBUAAEADQAhAAEAMQAsAAEALQA+AAYAFwAYABkAGgAdAB8AAwBWAAEAAABYAAEAAgBaAAgABQAGAAoAEwAZABoAGwAfAAUACwABABMAXAABAA0AIQABADEAKQABAC0APgAGABcAGAAZABoAHQAfAAMATAABAAAATgABAAIAUAAIAAUABgAKABMAGQAaABsAHwAFAAsAAQATAF4AAQANACEAAQAxACUAAQAtAD4ABgAXABgAGQAaAB0AHwAFAAsAAQATAGAAAQANACEAAQAxACoAAQAtAD4ABgAXABgAGQAaAB0AHwACAFoAAwAKABsAHwBWAAYAAAAFAAYAEwAZABoABAALAAEAEwAhAAEAMQAvAAEALQA+AAYAFwAYABkAGgAdAB8AAgBQAAMACgAbAB8ATAAGAAAABQAGABMAGQAaAAIAZAAEAAUAEwAZABoAYgAFAAMABAAKABsAHwACAGgAAwAKABsAHwBmAAYAAAAFAAYAEwAZABoAAQBqAAgAAQAHAAgADgAPABAAEQASAAMAbAACAAEADgBuAAIADwAQAHAAAgARABIAAQByAAYAAQAOAA8AEAARABIAAwAuAAEAMABCAAEALwB0AAQAFwAYABoAHQACADYAAQAwAHQABAAXABgAGgAdAAIAdgACAA8AEAB4AAIAEQASAAEAegACAAEADgABAHwAAgABAA4AAQB8AAIAAQAOAAEAfgACAAcACAABAIAAAgABAA4AAQCAAAIAAQAOAAEAggACABkAGgABAHoAAgABAA4AAQCEAAIABwAIAAIAhgABABQAiAABABwAAQCKAAIAAQAOAAIAjAABABQAjgABABwAAQCQAAEAAAABAJIAAQAAAAEAlAABAAEAAQCWAAEAAQABAJgAAQAVAAEAmgABABQAAQCcAAEABgABAJ4AAQAeAAEAoAABAB0AAQCiAAEAAQABAKQAAQAOAAEApgABAAEAAQCoAAEAFgABAKoAAQABAAEArAABAAEAAQCuAAEAAQABALAAAQABAAEAhgABABQAAQCyAAEAAQABALQAAQALAAEAtgABAAEAAQC4AAEAAQABALoAAQABAAEAvAABAAAAAQC+AAEADgABAMAAAQAOAAEAwgABABYAAQDEAAEAAQABAMYAAQAYAAEAyAABAAIAAQDKAAEADgABAMwAAQAOAAEAzgABAAwAAQDQAAEAFwAAAAAAAAAAAAAAAAAAAAAALAAAAFgAAACDAAAArgAAAMoAAADsAAAACgEAACgBAABEAQAAXwEAAHoBAACVAQAAsAEAAMsBAADmAQAAAQIAABUCAAApAgAAPgIAAE8CAABkAgAAdQIAAIoCAACfAgAArQIAAL8CAADNAgAA2wIAAOkCAAD0AgAAAQMAAAoDAAAXAwAAIQMAACoDAAAvAwAANAMAADkDAAA+AwAAQwMAAEgDAABNAwAAUgMAAFcDAABeAwAAYwMAAGoDAABuAwAAcgMAAHYDAAB6AwAAfgMAAIIDAACGAwAAigMAAI4DAACSAwAAlgMAAJoDAACeAwAAogMAAKYDAACqAwAArgMAALIDAAC2AwAAugMAAL4DAADCAwAAxgMAAMoDAADOAwAA0gMAANYDAADaAwAA3gMAAOIDAADmAwAA6gMAAO4DAAAAAAAAAAAAAAAAAAAAAQABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAAABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAIQAiACMAJAAlACYAJwAoACkAKgArACwALQAuAC8AMAAxADIAMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAABMAAAATAAAAEwAAABMAAAADAAAAEwAAAAEAAAABAAAAAwAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAEAAAASAAAAEgAAAAEAAAASAAAAAQAAABIAAAABAAAAAQAAABMAAAABAAAAEwAAAAMAAAATAAAAAwAAAAMAAAADAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAADAAAAEwAAAAAAAAATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALAAAAAAAAAAAAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQABAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABQAHAAAAAAAAAAAACQAAAAAAAAAAAAAAAAAAAAAACwAAAAAAAAAAAAAADQAPABEAAAAAAAAAEwAAADIABQA/AD4APgBIAEwARwBHAEcARwAAAAAAKAAAAAAALQAKAAMAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAAFIAAAAAAAEAAAAAAAAAAABNAAAAAAABAQAAAAAAAAAABAAAAAAAAQAAAAAAAAAAACsAAAAAAAEBAAAAAAAAAAAiAAAAAAABAQAAAAAAAAAABwAAAAAAAQEAAAAAAAAAAC0AAAAAAAEAAAAAAAAAAABHAAAAAAABAAAAAAAAAAAARAAAAAAAAQEAAAAAAAABAjMAAAAAAAIBAAAAAAAAAQIzAAAAAAAAAAQAAAEAAAIAAAAAAAAAAQIzAAAAAAAAACsAAAEAAAIBAAAAAAAAAQIzAAAAAAAAACIAAAEAAAIBAAAAAAAAAQIzAAAAAAAAAAcAAAEAAAIBAAAAAAAAAQIzAAAAAAAAAC0AAAEAAAIAAAAAAAAAAQIzAAAAAAAAAEcAAAEAAAIAAAAAAAAAAQIzAAAAAAAAAEQAAAEAAAEBAAAAAAAAAQEmAAAAAAACAAAAAAAAAAECMgAAAAAAAABSAAABAAACAAAAAAAAAAECMgAAAAAAAABNAAABAAABAQAAAAAAAAECMgAAAAAAAQAAAAAAAAABAjIAAAAAAAEBAAAAAAAAAAARAAAAAAABAQAAAAAAAAAACwAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAAAEAAAAAAAAQEAAAAAAAABASIAAAAAAAEAAAAAAAAAAQEiAAAAAAABAQAAAAAAAAAAHAAAAAAAAQAAAAAAAAABAjMAAAAAAAEAAAAAAAAAAAAXAAAAAAABAQAAAAAAAAEDMwAAAAAAAQEAAAAAAAAAABoAAAAAAAEAAAAAAAAAAQMzAAAAAAABAAAAAAAAAAAAFQAAAAAAAQEAAAAAAAAAAA8AAAAAAAEBAAAAAAAAAQQzAAAAAAABAQAAAAAAAAAAHgAAAAAAAQAAAAAAAAABBDMAAAAAAAEBAAAAAAAAAAAMAAAAAAABAQAAAAAAAAAADgAAAAAAAQEAAAAAAAAAAA0AAAAAAAEAAAAAAAAAAQMyAAAAAAABAQAAAAAAAAEDMgAAAAAAAQEAAAAAAAABBTMAAAAAAAEAAAAAAAAAAQUzAAAAAAABAQAAAAAAAAEFMQAAAAAAAQEAAAAAAAABASwAAAAAAAEBAAAAAAAAAAAUAAAAAAABAQAAAAAAAAAAGAAAAAAAAQEAAAAAAAABAS0AAAAAAAEBAAAAAAAAAAAwAAAAAAABAQAAAAAAAAAAGQAAAAAAAQEAAAAAAAAAABYAAAAAAAEBAAAAAAAAAQMsAAAAAAABAQAAAAAAAAEHLAAAAAAAAQEAAAAAAAAAAAgAAAAAAAEBAAAAAAAAAQUsAAAAAAABAQAAAAAAAAAANAAAAAAAAQEAAAAAAAABAS4AAAAAAAEBAAAAAAAAAAA9AAAAAAABAAAAAAAAAAAAIwAAAAAAAQEAAAAAAAABAiwAAAAAAAEBAAAAAAAAAQEwAAAAAAABAAAAAAAAAAEBMAAAAAAAAQEAAAAAAAABAiEAAAAAAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEDKQAAAAAAAQEAAAAAAAABAioAAAAAAAEBAAAAAAAAAAAfAAAAAAABAQAAAAAAAAEDLwAAAAAAAQEAAAAAAAAAADwAAAAAAAEBAAAAAAAAAABBAAAAAAABAQAAAAAAAAAARQAAAAAAAQEAAAAAAAABBCkAAAAAAAEBAAAAAAAAAAAkAAAAAAABAQAAAAAAAAEDKAAAAAAAAQEAAAAAAAAAADUAAAAAAAEBAAAAAAAAAQEjAAAAAAABAQAAAAAAAAAATgAAAAAAAQEAAAAAAAABBSsAAAAAAAEBAAAAAAAAAQMlAAAAAAABAQAAAAAAAAAAEwAAAAAAAQEAAAAAAAAAAEsAAAAAAAEBAAAAAAAAAQMkAAAAAAABAQAAAAAAAAEGKwAAAAAAAQEAAAAAAAABAScAAAAAAAEBAAAAAAAAAQEhAAAAAAABAQAAAAAAAAAAKgAAAAAAAQEAAAAAAAAAACkAAAAAAAEBAAAAAAAAAABRAAAAAAABAQAAAAAAAAAAEgAAAAAAAQEAAAAAAAAAADgAAAAAAAEBAAAAAAAAAAAdAAAAAAABAQAAAAAAAAAAJgAAAAAAAQEAAAAAAAAAACcAAAAAAAEBAAAAAAAAAAAJAAAAAAABAQAAAAAAAAAAOQAAAAAAfQB7AG1lbW9yeQBjb25zdABhc3NpZ25tZW50AGNvbW1lbnQAc3RhdGVtZW50AGNvbnN0YW50AHN0YXRlbWVudHMAZGVjbGFyYXRpb25zAG9wZXJhdG9yAHJlZ2lzdGVyAHdyaXRlcgBtZW1vcnlfcmVhZGVyAG51bWJlcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AbWVtb3J5X2V4cHJlc3Npb24Ac3lzY2FsbABsYWJlbABzdHJpbmcAdHlwZQBzY29wZQB2YXJpYWJsZV9uYW1lAHNvdXJjZV9maWxlAHZhcmlhYmxlAGVuZABkYXRhAF0AWwA/PQA6PQA7ADoAc3RhdGVtZW50c19yZXBlYXQxAGRlY2xhcmF0aW9uc19yZXBlYXQxAC8ALQAsACsAKgApACgAIQAKAAAADQAAADQAAAAAAAAAIQAAAAAAAABTAAAAAgAAAAEAAAAAAAAABwAAALALAAAAAAAA8AcAAIAMAADwFAAAAAAAAAAAAAAAAAAAQAkAAOAJAABICgAASgoAAGAKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADRQAACAUAABcFAAAGxMAABEUAAASEwAAEBMAAB0UAAAaFAAAWhQAAI0TAAAiFAAAHhQAAFgUAABWFAAAVBQAAEwUAABSFAAAThQAABgUAABQFAAAFhQAAN8TAAA+EwAAERQAANITAABoEwAAyhMAAF8TAACGEwAA2BMAAOoTAAAsEwAA+BMAAFITAACsEwAAkhMAAKcTAABHEwAANBMAAOQTAAAhEwAAjRMAAAQUAAC/EwAAfxMAAHETAAC4EwAAeBMAABQTAAA3FAAAJBQAAA=='));
for (var i = 0; i < encoded_levels.length; i++){
    var opt = document.createElement('option');
    opt.value = i;
    opt.innerHTML = "L"+i;
    document.getElementById('levels').appendChild(opt);
}
document.getElementById('levels').value = 3;

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
}
}