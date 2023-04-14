class State {
    constructor(memory, registers, data){
        this.memory = memory
        this.registers = registers;
        this.data = data;
    }
}

class VirtualMachine {

    update_vm(program, memory = new Array(100).fill(0), registers = {'$!':0, '$?':0, '$x':0, '$y':0}) {
        this.program = program;
        this.state = this.init_state(memory, registers);
    }

    init_state(memory, registers){
        var state_data={};
        map_strings_to_memory(this.program.data);

        return new State(memory,
            registers,
            state_data);

        function map_strings_to_memory(program_constants){
            var pointer = 0;
            Object.entries(program_constants).forEach(([id,str]) =>{
                //let pointer = memory_for_constants.length;
                state_data[id] = pointer;
                for(let char in str){
                    memory[pointer] = str.charCodeAt(char);
                    pointer += 1;
                }
                pointer += 1;
            });
        }
    }

    execute_bytecode() {
        var pc = this.state.registers['$!'];
        this.program.instructions[pc].handle(this);
        this.state.registers['$!']++;
    }

    assign_binary(cond, writer, reader1, opr, reader2) {
        if (cond && this.check_condition())
        return;
        let RHS = this.evaluate_binary(reader1, opr, reader2);
        this.write(writer, RHS);
    }

    assign_unary(cond, writer, opr, reader) {
        if (cond && this.check_condition())
        return;
        let RHS = this.evaluate_unary(opr, reader);
        this.write(writer, RHS);
    }

    assign(cond, writer, reader) {
        if (cond && this.check_condition())
        return;
        let RHS = this.read(reader);
        this.write(writer, RHS);
    }

    evaluate_binary(v1, opr, v2) {
        return eval(`${this.read(v1)} ${opr} ${this.read(v2)}`);
    }

    evaluate_unary(opr, v) { return eval(`${opr} ${this.read(v)}`); }

    check_condition() {
        return !this.state.registers['$?'];
    }
    
    write(writer, RHS){
        switch(writer.type){
            case WT.MEMORY:
                let mem_index =  this.read(new Reader(RT.REGISTER, writer.id));
                for (let i = 0; i < writer.offset; i++){
                    this.state.memory[mem_index] = RHS;
                    mem_index += 1;
                }
                break;
            case WT.REGISTER:
                if (writer.id in this.state.registers){
                    this.state.registers[writer.id] = RHS;
                }else {
                    throw new Error("Tried to write to a register that does not exist");
                } 
                break;
        }
    }
    
    read(reader){
        switch(reader.type){
            case RT.REGISTER:
                if (reader.id in this.state.registers){
                    return this.state.registers[reader.id];
                }
                throw new Error("Register ",reader.id," not found");
            case RT.MEMORY:
                let mem_index =  this.read(new Reader(RT.REGISTER, reader.id));
                let return_value = 0;
                try{
                    for (let i = 0; i < reader.offset; i++){
                        return_value += this.state.memory[mem_index];
                        mem_index += 1;
                    }
                }catch (error){
                    if(mem_index > this.state.memory.length){
                        console.log("Memory index out of bounds");
                    }
                }

                return return_value
            case RT.CONSTANT:
                if (reader.id in this.program.constants){
                    return parseInt(this.program.constants[reader.id]);
                }
                throw new Error("Constant ",reader.id," not found");
            case RT.DATA:
                if (reader.id in this.state.data){
                    return this.state.data[reader.id];
                }
                throw new Error("Data ",reader.id," not found")
            case RT.LABEL:
                if (reader.id in this.program.labels){
                    return this.program.labels[reader.id];
                }
                throw new Error("Label ",reader.id," not found")
            case RT.NUMBER:
                //the number that the reader holds, is the id in this case
                return reader.id;
        }
    }
    
    syscall(){
        switch(this.state.registers["$x"]) {
            case 0: // print int
                console.log(this.state.registers["$y"]);
                outputSpan.innerHTML = this.state.registers["$y"];
                break;
            case 1: // print str
                var idx = this.state.registers["$y"];
                var str = "";
                while(this.state.memory[idx] != 0) {
                    str += String.fromCharCode(this.state.memory[idx]);
                    idx++;
                }
                console.log(str);
                outputSpan.innerHTML = str;
                break;
            default:
                console.log("Syscall Error");
                outputSpan.innerHTML = "Syscall Error";
                break;
        }
    }
}