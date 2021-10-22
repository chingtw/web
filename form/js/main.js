$(document).ready(function () {
    
});

function opfrom1(){
	$('#from1').fadeIn();
	$('#from2').fadeOut();
	$('#from3').fadeOut();
	$('html, body').animate({ scrollTop: $('#from1').offset().top }, 1000);
	reSize();
}

function opfrom2(){
	Swal.fire({
		imageUrl: 'images/201511915392854716.jpg',
        imageWidth: 200,
        imageHeight: 200,
        title: '還在趕工中!',
	}).then((result) => {
		$('#from2').fadeOut();
	    $('#from3').fadeIn();
	})
	$('#from1').fadeOut();
	$('#from2').fadeIn();
	$('#from3').fadeOut();
	$('html, body').animate({ scrollTop: $('#from2').offset().top }, 1000);
	parent.document.all.frameid.height =0;
	
}
function opfrom3(){
	/*Swal.fire({
		imageUrl: 'images/201511915392854716.jpg',
        imageWidth: 200,
        imageHeight: 200,
        title: '還在趕工中!',
	}).then((result) => {
		$('#from2').fadeOut();
	})*/
	$('#from1').fadeOut();
	$('#from2').fadeOut();
	$('#from3').fadeIn();
	$('html, body').animate({ scrollTop: $('#from3').offset().top }, 1000);
	parent.document.all.frameid.height =0;
	
}
//https://script.google.com/home 
//寫入資料
function datapost(){
	$.ajax({
		type: "post",
		url: "https://script.google.com/macros/s/AKfycbzY8xSlZsiAPKedMmH2_ZONYkpgG6eYTja_pzdiFppkVJVO3LGS9vk4CZzVYxKW1_SOlQ/exec",
			data: {
					"order_time": "2021/10/11",
					"order_name": "這是ajax測試",
					"order_forwhom": "這是ajax測試",
					"order_way": "這是ajax測試",
					"order_commodity": "這是ajax測試",
					"order_platform": "這是ajax測試",
					"order_url": "這是ajax測試",
					"order_money": "這是ajax測試",
					"order_date1": "這是ajax測試",
					"order_date2": "這是ajax測試",
					"order_shippingdate": "這是ajax測試",
					"order_delivery": "這是ajax測試",
					"order_deliverycode": "這是ajax測試",
					"order_urgent": "urgent"
			},
			success: function(response) {
			  if(response == "成功"){
				 alert(response);
			   }
			 }
		});

}
//呼叫資料
function dataget(){
	
    $.ajax({
    type: "get",
    url: "https://script.google.com/macros/s/AKfycbzY8xSlZsiAPKedMmH2_ZONYkpgG6eYTja_pzdiFppkVJVO3LGS9vk4CZzVYxKW1_SOlQ/exec",
        data: { "type": "select",
                "order_name": "CHING"
        },
        success: function(response) {
           alert(response);
         }
    });
}