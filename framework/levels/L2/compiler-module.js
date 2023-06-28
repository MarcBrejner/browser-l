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