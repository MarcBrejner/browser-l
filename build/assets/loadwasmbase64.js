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

encoded = encoded_l
var L_wasm = decode(encoded);