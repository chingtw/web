function opfrom2() {
	Swal.fire({
		imageUrl: 'images/201511915392854716.jpg',
		imageWidth: 200,
		imageHeight: 200,
		title: '還在趕工中!',
	}).then((result) => {
		$('#from2').fadeOut();
		$('#from3').fadeIn();
	})
}

function opfrom3() {
	Swal.fire({
		imageUrl: 'images/201511915392854716.jpg',
		imageWidth: 200,
		imageHeight: 200,
		title: '還在趕工中!',
	}).then((result) => {
		$('#from2').fadeOut();
	})
}
