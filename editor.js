var myCodeMirror = CodeMirror.fromTextArea(document.getElementById('editor1'), {
    lineNumbers: true
})

myCodeMirror.on('change',function(cMirror){
    // get value right from instance
    console.log(cMirror.getValue());
});

function clickclick(){
    console.log(myCodeMirror.getValue())
}