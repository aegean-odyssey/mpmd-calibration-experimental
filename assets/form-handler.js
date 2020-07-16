/* FORM-HANDLER.JS

   handles a simple form submission. The code calls the function, curvefit(),
   to generate the response. As arguments, curvefit(), accepts the contents of
   an uploaded text file and a reference to the submitting form. It returns an
   array containing a result code, an array of strings, a file name, and mime
   type. The code here uses these values to create the "server" response.

  [ result, string_array, file_name, mime_type ] =
	curvefit(file_contents_string, submitting_form);

*/
window.addEventListener('load', function() {
    function process(file, form) {
	const [ result, strs, name, mime ] = curvefit(file, form);
	const ops = { type: mime, endings: "transparent" };
        const URL = window.URL || window.webkitURL;
        var url = URL.createObjectURL(new File(strs, name, ops));
        window.location = url;
        URL.revokeObjectURL(url);
    }
    function submit(a) {
        const fr = new FileReader();
        fr.onload = function(e) { process(e.target.result, a.target) };
        fr.readAsText(document.getElementById('FILE').files[0]);
    }
    const f = document.getElementById('FORM');
    f.addEventListener('submit', submit, false);
});
