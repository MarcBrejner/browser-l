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
var emit_functions = new Array();
emit_functions.push((function (statement){
    SourceCodeBuilder.addStatement(statement.text)
}))
encoded_levels.push(decode('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AAAAFwABAAsAGgABAAwAHQABABAAIAABABEABwABACAAEQABAB4AEwABABwAFAABABsAIAABABgACgAHAAEACwAJAAEADAALAAEAEAANAAEAEQAjAAEAAAAHAAEAIAARAAEAHgATAAEAHAAUAAEAGwAgAAEAGAAFACUAAQADACgAAQAEAAkAAQAfABgAAQAWACsABAALAAwAEAARAAUAAwABAAMABQABAAQACQABAB8AGAABABYALQAEAAsADAAQABEABwAJAAEADAALAAEAEAANAAEAEQARAAEAHgATAAEAHAAUAAEAGwAeAAEAGAADAC8AAQAAADEAAQACADMABAALAAwAEAARAAMAFQABAAAANQABAAIANwAEAAsADAAQABEAAQA5AAYAAwAEAAsADAAQABEAAQA7AAUAAAALAAwAEAARAAEALwAFAAAACwAMABAAEQABAD0ABAABAAUABgASAAEAPwAEAAEABQAGABIAAQBBAAIABQAGAAIAQwABAAUARQABAAYAAQBHAAIAAQASAAEASQACAAEAEgACAEsAAQABAE0AAQASAAEATwABAAEAAQBRAAEABwABAFMAAQACAAEAVQABAAAAAQBXAAEADwABAFkAAQANAAEAWwABAAEAAQBdAAEAAQABAF8AAQABAAEAYQABAAAAAQBjAAEAAQABAGUAAQAAAAEAZwABAAEAAQBpAAEAAQABAGsAAQAOAAEAbQABAAEAAQBvAAEAEAABAFEAAQAIAAEAcQABAAEAAAAAAAAAAAAAAAAAAAAfAAAAPgAAAFcAAAB2AAAAjwAAAK4AAADNAAAA4AAAAPMAAAAJAQAAFgEAACMBAAAsAQAANAEAADwBAABDAQAASgEAAE8BAABWAQAAWwEAAGABAABnAQAAawEAAG8BAABzAQAAdwEAAHsBAAB/AQAAgwEAAIcBAACLAQAAjwEAAJMBAACXAQAAmwEAAJ8BAACjAQAApwEAAKsBAACvAQAAAAAAAAAAAwADAAMAAQAAAAEAAQABAAIAAgAAAAIAAQACAAIAAAAAAAAAAAAAAQABAAABAAABAAABAAABAAABAAABAQABAQABAQABAQABAQABAAABAAABAAABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQABAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAQABEAEgATABQAFQAWABcAGAAZABoAGwAcAB0AHgAfACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACEAAAAhAAAAAAAAAAAAAAAAAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAwAAAAAAAAAEAAAAIQAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAQABAAAAAQABAAEAAQAAAAAAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAFAAAAAAAAAAAAAAAAAAcACQAAAAAAAAALAA0AAAAAACMABQAYACEAIAAAAAAAFAATAAAAEQAKAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQEAAAAAAAAAABkAAAAAAAEBAAAAAAAAAAApAAAAAAABAQAAAAAAAAAACwAAAAAAAQEAAAAAAAAAACgAAAAAAAEBAAAAAAAAAAARAAAAAAABAQAAAAAAAAAAJQAAAAAAAQEAAAAAAAAAABUAAAAAAAEAAAAAAAAAAAAGAAAAAAABAQAAAAAAAAAAFgAAAAAAAQEAAAAAAAABAiAAAAAAAAIBAAAAAAAAAQIgAAAAAAAAAAsAAAEAAAIBAAAAAAAAAQIgAAAAAAAAACgAAAEAAAIBAAAAAAAAAQIgAAAAAAAAABEAAAEAAAIBAAAAAAAAAQIgAAAAAAAAACUAAAEAAAEBAAAAAAAAAQEXAAAAAAACAQAAAAAAAAECHwAAAAAAAAAZAAABAAACAQAAAAAAAAECHwAAAAAAAAApAAABAAABAQAAAAAAAAECHwAAAAAAAQEAAAAAAAABARUAAAAAAAEBAAAAAAAAAQMgAAAAAAABAQAAAAAAAAAADwAAAAAAAQAAAAAAAAABAyAAAAAAAAEBAAAAAAAAAAAQAAAAAAABAAAAAAAAAAECIAAAAAAAAQEAAAAAAAABAx8AAAAAAAEBAAAAAAAAAQQgAAAAAAABAQAAAAAAAAEBHAAAAAAAAQEAAAAAAAABBR4AAAAAAAEBAAAAAAAAAQEbAAAAAAABAQAAAAAAAAAAAgAAAAAAAQEAAAAAAAAAAAMAAAAAAAEBAAAAAAAAAQEdAAAAAAABAQAAAAAAAAEBGgAAAAAAAQEAAAAAAAABARkAAAAAAAEBAAAAAAAAAAAEAAAAAAABAQAAAAAAAAAAGgAAAAAAAQEAAAAAAAAAAB8AAAAAAAEBAAAAAAAAAAAOAAAAAAABAQAAAAAAAAECFAAAAAAAAQEAAAAAAAAAACYAAAAAAAEBAAAAAAAAAAAcAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAABAhYAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAEBFAAAAAAAAQEAAAAAAAABAxgAAAABAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEDGAAAAAIAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAAASAAAAAAABAQAAAAAAAAECGQAAAAAAAQEAAAAAAAAAAB0AAAAAAAEBAAAAAAAAAQMZAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBkZWNsYXJhdGlvbnMAb3BlcmF0b3IAcmVnaXN0ZXIAd3JpdGVyAHJlYWRlcgBudW1iZXIAZGF0YXZhcgBjb25zdGFudF9kZWNsYXJhdGlvbgBkYXRhX2RlY2xhcmF0aW9uAGV4cHJlc3Npb24AYXNzaWduAHN5c2NhbGwAbGFiZWwAY29uZGl0aW9uYWwAdHlwZQBzb3VyY2VfZmlsZQBlbmQAZGF0YQBdAFsAPz0AOj0AOwBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALAAKAAAADQAAACEAAAAAAAAAFAAAAAAAAAArAAAAAgAAAAMAAAACAAAABQAAANAFAAAAAAAAcAMAAGAGAACgCwAAJAwAABQEAAAgBAAAQAQAALAEAADyBAAAAAUAACAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzQoAAOAKAAAMCwAA/wkAANEKAADdCgAA2goAAGoKAAB/CgAAGgoAANEKAACqCgAA2AoAAAoLAADWCgAAvAoAAEQKAACiCgAAOwoAAFsKAADBCgAALgoAAIQKAAAjCgAAEAoAAJAKAABUCgAATQoAAJsKAABiCgAA+AkAAPUKAADiCgAAAAAAAAUKAACwCgAA'));
emit_functions.push((function (statement){
    if (statement.childCount === 0)  {
        SourceCodeBuilder.addStatement(statement.text);
        return;
    }
    if (statement.child(0).type == 'goto'){
        SourceCodeBuilder.addStatement(`$! ?= ${statement.child(1).text} - 1;`)
    }
    SourceCodeBuilder.addStatement(statement.text);
}))
encoded_levels.push(decode('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ABIABAABACEAEgABAB8AFAABABwAFQABAB0AIgABABkACwAHAAEABwAJAAEADAALAAEADQANAAEAEQAPAAEAEgAGAAEAIQASAAEAHwAUAAEAHAAVAAEAHQAcAAEAGAAiAAEAGQALAAcAAQAHAAkAAQAMAAsAAQANAA0AAQARAA8AAQASACgAAQAAAAQAAQAhABIAAQAfABQAAQAcABUAAQAdACIAAQAZAAcACwABAA0ADQABABEAFQABABQAEgABAB8ALAABABsAFgACAB0AHgARAAMACgALAAwABwALAAEADQANAAEAEQAVAAEAFAASAAEAHwApAAEAGwAWAAIAHQAeABEAAwAKAAsADAAFACoAAQADAC0AAQAEAAkAAQAgABkAAQAXADAABQAHAAwADQARABIABQADAAEAAwAFAAEABAAJAAEAIAAZAAEAFwAyAAUABwAMAA0AEQASAAgABwABAAcACwABAA0ADQABABEADwABABIAEgABAB8AFAABABwAFQABAB0AHwABABkAAQA0AAcAAwAEAAcADAANABEAEgADABcAAQAAADYAAQACADgABQAHAAwADQARABIAAwA6AAEAAAA8AAEAAgA+AAUABwAMAA0AEQASAAEAQAAGAAAABwAMAA0AEQASAAEAOgAGAAAABwAMAA0AEQASAAEAQgAEAAEABQAGABMAAQBEAAQAAQAFAAYAEwABAEYAAgABABMAAgBIAAEABQBKAAEABgABAEwAAgAFAAYAAQBOAAIAAQATAAIAUAABAAEAUgABABMAAQBUAAIADAARAAEAVgABAAEAAQBYAAEAAgABAFoAAQAIAAEAXAABAAAAAQBeAAEADgABAGAAAQAQAAEAYgABAAEAAQBkAAEAAQABAGYAAQABAAEAaAABAAEAAQBqAAEAAAABAGwAAQABAAEAbgABAAAAAQBwAAEAAQABAHIAAQABAAEAdAABAA8AAQB2AAEAAQABAHgAAQARAAEAWgABAAkAAQB6AAEAAQAAAAAAAAAfAAAAPgAAAGAAAACCAAAApAAAAL0AAADWAAAA6gAAAP4AAAAXAQAAIQEAAC8BAAA9AQAARgEAAE8BAABWAQAAXQEAAGIBAABpAQAAbgEAAHMBAAB6AQAAfwEAAIMBAACHAQAAiwEAAI8BAACTAQAAlwEAAJsBAACfAQAAowEAAKcBAACrAQAArwEAALMBAAC3AQAAuwEAAL8BAADDAQAAxwEAAMsBAAAAAAAAAAAAAAAAAgACAAMABQADAAMAAAADAAEAAQAAAAEAAQABAAIAAgAAAAIAAQACAAIAAAEAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACQAAAAkAAAAAAAAAAAAAAADAAAAAwAAAAMAAAAAAAAAAAAAAAMAAAADAAAAAAAAAAAAAAAkAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAQABAAAAAQABAAEAAQABAAAAAAABAAEAAQABAAEAAQABAAEAAQABAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAUAAAAAAAcAAAAAAAAAAAAJAAsAAAAAAAAADQAPAAAAAAAlAAUAGQAjACIAAAAAABQAFQAAABIACgAGAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAArAAAAAAABAQAAAAAAAAAAGAAAAAAAAQEAAAAAAAAAAAsAAAAAAAEBAAAAAAAAAAAqAAAAAAABAQAAAAAAAAAAEgAAAAAAAQEAAAAAAAAAACcAAAAAAAEBAAAAAAAAAAATAAAAAAABAAAAAAAAAAAACAAAAAAAAQEAAAAAAAAAABYAAAAAAAEBAAAAAAAAAQIhAAAAAAACAQAAAAAAAAECIQAAAAAAAAAYAAABAAACAQAAAAAAAAECIQAAAAAAAAALAAABAAACAQAAAAAAAAECIQAAAAAAAAAqAAABAAACAQAAAAAAAAECIQAAAAAAAAASAAABAAACAQAAAAAAAAECIQAAAAAAAAAnAAABAAABAQAAAAAAAAEBGAAAAAAAAgEAAAAAAAABAiAAAAAAAAAAGwAAAQAAAgEAAAAAAAABAiAAAAAAAAAAKwAAAQAAAQEAAAAAAAABAiAAAAAAAAEBAAAAAAAAAQEWAAAAAAABAQAAAAAAAAEDIAAAAAAAAQEAAAAAAAAAABAAAAAAAAEAAAAAAAAAAQIhAAAAAAABAQAAAAAAAAEDIQAAAAAAAQEAAAAAAAAAAA8AAAAAAAEAAAAAAAAAAQMhAAAAAAABAQAAAAAAAAEEIQAAAAAAAQEAAAAAAAABBR8AAAAAAAEBAAAAAAAAAQEdAAAAAAABAQAAAAAAAAEBHgAAAAAAAQEAAAAAAAAAAAIAAAAAAAEBAAAAAAAAAAADAAAAAAABAQAAAAAAAAEBHAAAAAAAAQEAAAAAAAABARsAAAAAAAEBAAAAAAAAAQEaAAAAAAABAQAAAAAAAAAABwAAAAAAAQEAAAAAAAAAACAAAAAAAAEBAAAAAAAAAAAaAAAAAAABAQAAAAAAAAAADAAAAAAAAQEAAAAAAAAAACEAAAAAAAEBAAAAAAAAAQIVAAAAAAABAQAAAAAAAAAAHgAAAAAAAQEAAAAAAAAAACgAAAAAAAEBAAAAAAAAAAAOAAAAAAABAQAAAAAAAAECGQAAAAEAAQEAAAAAAAABAhcAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAEBFQAAAAAAAQEAAAAAAAABAxkAAAACAAEBAAAAAAAAAgAAAAAAAAABAQAAAAAAAAEDGQAAAAMAAQEAAAAAAAABARkAAAAAAAEBAAAAAAAAAAARAAAAAAABAQAAAAAAAAECGgAAAAAAAQEAAAAAAAAAAB0AAAAAAAEBAAAAAAAAAQMaAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBkZWNsYXJhdGlvbnMAb3BlcmF0b3IAcmVnaXN0ZXIAd3JpdGVyAHJlYWRlcgBudW1iZXIAZGF0YXZhcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AZXhwcmVzc2lvbgBhc3NpZ24Ac3lzY2FsbABsYWJlbABjb25kaXRpb25hbAB0eXBlAHNvdXJjZV9maWxlAGVuZABkYXRhAF0AWwA/PQA6PQA7AHN0YXRlbWVudHNfcmVwZWF0MQBkZWNsYXJhdGlvbnNfcmVwZWF0MQAsAAoAAAAAAAANAAAAIgAAAAAAAAAVAAAAAAAAAC0AAAACAAAABAAAAAMAAAAFAAAAMAYAAAAAAACgAwAAwAYAAFAMAADgDAAAUAQAAGAEAACABAAA8AQAADQFAABABQAAcAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB6CwAAjQsAALkLAACnCgAAfgsAAIoLAACHCwAAEgsAABcLAAAsCwAAwgoAAH4LAABXCwAAhQsAALcLAACDCwAAaQsAAOwKAABPCwAA4woAAAMLAABuCwAA1goAADELAADLCgAAuAoAAD0LAAD8CgAA9QoAAEgLAAAKCwAAoAoAAKILAACPCwAAAAAAAAAAAAAAAAAArQoAAF0LAAASCwAA'));
emit_functions.push((function (statement){
    if (statement.childCount === 0)  {
        SourceCodeBuilder.addStatement(statement.text);
        return;
    }

    if (statement.child(0).type == 'variable_name'){
        var variableName = statement.child(0).text;
        var variableType = statement.child(2).text;
        variables.variableTypes[variableName] = variableType;
        var variableSize = parseInt(variableType.replace(/\D/g, ''));
        var memory_allocation = "";
        for (var i = 0; i < variableSize/8; i++) {
            memory_allocation += "0";
        }
        var dataCode = `data &${variableName} "${memory_allocation}";\n`;
        var assign = `$n:=&${variableName};\n`;
        SourceCodeBuilder.addDeclaration(dataCode);
        SourceCodeBuilder.addStatement(assign);
        if (!statement.child(4).toString().includes('variable_name')) { 
            expr = `[$n,${variableType}]:=${statement.child(4).text};\n`;
            SourceCodeBuilder.addStatement(expr);
        } else {
            buildExpressionWithVariable(statement, 2);
        }
        
        return;
    }
    
    
    if (statement.childCount >= 3) {
        if (statement.child(2).toString().includes('variable_name')) {
           buildExpressionWithVariable(statement, 0)
           return;
        }     
    }

    SourceCodeBuilder.addStatement(statement.text);

    function buildExpressionWithVariable(statement, childOffset) {
        var binaryExpression = statement.child(2 + childOffset).childCount === 3;
        var reader1 = statement.child(2 + childOffset).child(0).child(0);
        var reader2 = binaryExpression ? statement.child(2 + childOffset).child(2).child(0) : null;
        var expression = statement.child(2 + childOffset);
        // L2: $x := f + g
        // L0: 
        // $n := &f;
        // $m := &g;
        // $x := [$n, u8] + [$m,u32]
        if (binaryExpression && reader1.type === 'variable_name' && reader2.type === 'variable_name') {
            SourceCodeBuilder.addStatement(`$n:=&${reader1.text};\n`);
            SourceCodeBuilder.addStatement(`$m:=&${reader2.text};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=[$n,${variables.variableTypes[reader1.text]}] ${expression.child(1).text} [$m,${variables.variableTypes[reader2.text]}];\n`);
        } 
        // L2: $x := f + 5
        // L0: 
        // $n := &f;
        // $x := [$n, u8] + 5
        else if (binaryExpression && reader1.type === 'variable_name') {
            SourceCodeBuilder.addStatement(`$n:=&${reader1.text};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=[$n,${variables.variableTypes[reader1.text]}] ${expression.child(1).text} ${expression.child(2).text};\n`);
        }

        // L2: $x := 5 + g
        // L0: 
        // $n := &g;
        // $x := 5 + [$n, u8] 
        else if (binaryExpression && reader2.type === 'variable_name') {
            SourceCodeBuilder.addStatement(`$n:=&${reader2.text};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=${expression.child(0).text} ${expression.child(1).text} [$n,${variables.variableTypes[reader2.text]}];\n`);
        }

        // L2: $x := g
        // L0: 
        // $n := &g;
        // $x := [$n, u8] 
        else if (!binaryExpression) {
            SourceCodeBuilder.addStatement(`$n:=&${reader1.text};\n`);
            SourceCodeBuilder.addStatement(`${statement.child(0).text}:=[$n,${variables.variableTypes[reader1.text]}];\n`);
        }
    }
})
)
encoded_levels.push(decode('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AQAcAAcACwABAA8ADQABABMAEgABACIALQABAB4AFwACABYAFwAVAAIAIAAhABMAAwAMAA0ADgAHAAsAAQAPAA0AAQATABIAAQAiADEAAQAeABcAAgAWABcAFQACACAAIQATAAMADAANAA4ABgAvAAEAAwAyAAEABAAKAAEAIwAaAAEAGgA1AAMACQAUABcANwADAA4ADwATAAYAAwABAAMABQABAAQACgABACMAGgABABoAOQADAAkAFAAXADsAAwAOAA8AEwAJAAcAAQAJAAsAAQAPAA0AAQATAA8AAQAUABEAAQAXABIAAQAiABYAAQAfABcAAQAgACIAAQAcAAIAPwADAA4ADwATAD0ABQADAAQACQAUABcAAwBBAAEAAABDAAEAAgBFAAYACQAOAA8AEwAUABcAAwAbAAEAAABHAAEAAgBJAAYACQAOAA8AEwAUABcAAgBNAAMACQAUABcASwAEAAAADgAPABMAAgBFAAMACQAUABcAQQAEAAAADgAPABMAAQBPAAQAAQAHAAgAFQABAFEABAABAAcACAAVAAIAUwABAAEAVQABABUAAQBXAAIAAQAVAAIAWQABAAcAWwABAAgAAQBdAAIABwAIAAEAXwACAAEAFQABAGEAAgAOABMAAQBjAAEAAQABAGUAAQACAAEAZwABAAoAAQBpAAEAAAABAGsAAQASAAEAbQABABAAAQBvAAEAEgABAHEAAQAGAAEAcwABAAEAAQB1AAEAAQABAHcAAQABAAEAeQABAAEAAQB7AAEAAAABAH0AAQABAAEAfwABAAAAAQCBAAEAAQABAIMAAQAFAAEAhQABABEAAQCHAAEAAQABAIkAAQABAAEAiwABABMAAQBnAAEACwABAI0AAQABAAEAjwABAAEAAAAAACAAAABAAAAAYAAAAIUAAACqAAAAzwAAAOkAAAADAQAAGgEAADEBAABNAQAAWgEAAGkBAAB4AQAAhAEAAJABAACXAQAAngEAAKUBAACqAQAAsQEAALYBAAC7AQAAwAEAAMQBAADIAQAAzAEAANABAADUAQAA2AEAANwBAADgAQAA5AEAAOgBAADsAQAA8AEAAPQBAAD4AQAA/AEAAAACAAAEAgAACAIAAAwCAAAQAgAAFAIAABgCAAAcAgAAAAAAAAAAAgACAAMABQADAAgABQAAAAAAAAAAAAAAAAADAAAAAwABAAEAAAABAAEAAQACAAIAAAACAAEAAgACAAQAAAAEAAEABAACAAQAAwAEAAQAAAAAAAAAAAAAAAAAAAEAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQAAAQAAAQAAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAQEAAAAAAAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABIAEwAUABUAFgAXABgAGQAaABsAHAAdAB4AHwAgACEAIgAjACQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAwAAAAMAAAADAAAAFwAAABcAAAAXAAAAAwAAAAMAAAAEAAAABAAAABcAAAAEAAAAFgAAABYAAAAXAAAAFwAAAAQAAAAEAAAABAAAAAQAAAAEAAAABAAAAAQAAAAAAAAAAAAAABYAAAAEAAAAAAAAAAsAAAAAAAAACwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAAFwAAAAAAAAAAAAAAAAAAAAAAAAABAAEAAAABAAEAAQABAAEAAQABAAAAAAABAAEAAQABAAEAAQABAAEAAQAAAAEAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMABQAAAAAAAAAAAAcAAAAAAAAAAAAJAAsAAAAAAAAADQAPAAAAAAARACgABgAaACYAJQAAAAAAFgAXAAAAEgALAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAMAAAAAAAAAAQAAAAAAAAAAABwAAAAAAAEAAAAAAAAAAAAvAAAAAAABAAAAAAAAAAAAGQAAAAAAAQEAAAAAAAAAAAwAAAAAAAEBAAAAAAAAAAAuAAAAAAABAQAAAAAAAAAAEgAAAAAAAQAAAAAAAAAAACwAAAAAAAEAAAAAAAAAAAAqAAAAAAABAQAAAAAAAAAAGAAAAAAAAQAAAAAAAAAAAAgAAAAAAAEBAAAAAAAAAAAVAAAAAAABAQAAAAAAAAEBGwAAAAAAAQEAAAAAAAABAiQAAAAAAAIAAAAAAAAAAQIkAAAAAAAAABkAAAEAAAIBAAAAAAAAAQIkAAAAAAAAAAwAAAEAAAIBAAAAAAAAAQIkAAAAAAAAAC4AAAEAAAIBAAAAAAAAAQIkAAAAAAAAABIAAAEAAAIAAAAAAAAAAQIkAAAAAAAAACwAAAEAAAIAAAAAAAAAAQIkAAAAAAAAACoAAAEAAAIAAAAAAAAAAQIjAAAAAAAAABwAAAEAAAIAAAAAAAAAAQIjAAAAAAAAAC8AAAEAAAEAAAAAAAAAAQIjAAAAAAABAQAAAAAAAAECIwAAAAAAAQAAAAAAAAABARkAAAAAAAEBAAAAAAAAAQEZAAAAAAABAAAAAAAAAAEDIwAAAAAAAQEAAAAAAAABAyMAAAAAAAEBAAAAAAAAAQMkAAAAAAABAQAAAAAAAAAAEAAAAAAAAQAAAAAAAAABAyQAAAAAAAEBAAAAAAAAAAARAAAAAAABAAAAAAAAAAECJAAAAAAAAQEAAAAAAAABBCQAAAAAAAEAAAAAAAAAAQQkAAAAAAABAQAAAAAAAAEBIAAAAAAAAQEAAAAAAAABBSIAAAAAAAEBAAAAAAAAAQEdAAAAAAABAQAAAAAAAAAACQAAAAAAAQEAAAAAAAABAR4AAAAAAAEBAAAAAAAAAAADAAAAAAABAQAAAAAAAAAABAAAAAAAAQEAAAAAAAABAR8AAAAAAAEBAAAAAAAAAQEhAAAAAAABAQAAAAAAAAAAIwAAAAAAAQEAAAAAAAAAABsAAAAAAAEBAAAAAAAAAAANAAAAAAABAQAAAAAAAAAAJAAAAAAAAQEAAAAAAAABAhgAAAAAAAEBAAAAAAAAAAAhAAAAAAABAQAAAAAAAAAAIAAAAAAAAQEAAAAAAAAAACsAAAAAAAEBAAAAAAAAAAACAAAAAAABAQAAAAAAAAAADgAAAAAAAQEAAAAAAAABAhwAAAABAAEBAAAAAAAAAQIaAAAAAAABAQAAAAAAAAAADwAAAAAAAQEAAAAAAAABARgAAAAAAAEBAAAAAAAAAQMcAAAAAgABAQAAAAAAAAIAAAAAAAAAAQEAAAAAAAABAxwAAAADAAEBAAAAAAAAAAAeAAAAAAABAQAAAAAAAAAAEwAAAAAAAQEAAAAAAAABARwAAAAAAAEBAAAAAAAAAQIdAAAAAAABAQAAAAAAAAAAHwAAAAAAAQEAAAAAAAABBRwAAAAEAAEBAAAAAAAAAQMdAAAAAABtZW1vcnkAY29uc3QAYXNzaWdubWVudABzdGF0ZW1lbnQAY29uc3RhbnQAc3RhdGVtZW50cwBkZWNsYXJhdGlvbnMAb3BlcmF0b3IAcmVnaXN0ZXIAd3JpdGVyAHJlYWRlcgBudW1iZXIAZGF0YXZhcgBnb3RvAGNvbnN0YW50X2RlY2xhcmF0aW9uAGRhdGFfZGVjbGFyYXRpb24AZXhwcmVzc2lvbgBhc3NpZ24Ac3lzY2FsbABsYWJlbABjb25kaXRpb25hbAB0eXBlAHZhcmlhYmxlX25hbWUAc291cmNlX2ZpbGUAdmFyaWFibGUAZW5kAGRhdGEAXQBbAD89ADo9ADsAOgBzdGF0ZW1lbnRzX3JlcGVhdDEAZGVjbGFyYXRpb25zX3JlcGVhdDEALAAKAAAAAAANAAAAJQAAAAAAAAAYAAAAAAAAADIAAAACAAAABQAAAAQAAAAFAAAAMAcAAAAAAABABAAA0AcAACAOAADADgAAAAUAACAFAABgBQAA0AUAABoGAAAgBgAAYAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJDQAAXA0AAIoNAABfDAAATQ0AAF4NAABaDQAAWQ0AAFYNAADKDAAAzwwAAOQMAAB6DAAATQ0AAA8NAABUDQAAiA0AAFINAAAhDQAApAwAAAcNAACbDAAAuwwAACYNAAA0DQAAjgwAAOkMAACDDAAAcAwAAPUMAAC0DAAArQwAAAANAADCDAAAWAwAAHMNAABgDQAAAAAAAAAAAAAAAAAAAAAAAGUMAAAVDQAAygwAAEANAAA='));

    for (var i = 0; i<=emit_functions.length-1; i++){
        var opt = document.createElement('option');
        opt.value = i;
        opt.innerHTML = "L"+i;
        document.getElementById('levels').appendChild(opt);
    }
    document.getElementById('levels').value = 2;
    