$(document).ready(function () {
	sessionStorage.clear(); 
	$('.double-wrap').hide();
	$('.double').hide();
	$('#gobt1').hide();
	$('#inputinfo1').hide();
	$('#inputinfo2').hide();
	$('#inputinfo3').hide();
	$('#inputinfo4').hide();
	$('#inputinfo5').hide();
	$('#inputinfo6').hide();
	$('#inputinfo7').hide();
	$('#inputinfo8').hide();
	$('#inputinfo9').hide();
	$('#goback').hide();
	$("#name").bind("input propertychange", function (event) {
		$('#gobt1').fadeIn();
		$('#inputinfo1').hide();
		$('#inputinfo2').hide();
		$('#inputinfo3').hide();
		$('#inputinfo4').hide();
		$('#inputinfo5').hide();
		$('#inputinfo6').hide();
		$('#inputinfo7').hide();
		$('#inputinfo8').hide();
		$('#inputinfo9').hide();
		$('#goodbt').html('');
		$('#goback').hide();
		$('#ddinfo').text("(請輸入網購登記相同名稱)");
	});
});

function opfrom1() {
	$('#from1').fadeIn();
	$('#from2').fadeOut();
	$('#from3').fadeOut();
	$('html, body').animate({ scrollTop: $('#from1').offset().top }, 1000);
	reSize();
}

function opfrom2() {
	/*Swal.fire({
		imageUrl: 'images/201511915392854716.jpg',
		imageWidth: 200,
		imageHeight: 200,
		title: '還在趕工中!',
	}).then((result) => {
		$('#from2').fadeOut();
		$('#from3').fadeIn();
	})*/
	$('#from1').fadeOut();
	$('#from2').fadeIn();
	$('#from3').fadeOut();
	$('html, body').animate({ scrollTop: $('#from2').offset().top }, 1000);
	parent.document.all.frameid.height = 0;

}
function opfrom3() {
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
	parent.document.all.frameid.height = 0;

}
//https://script.google.com/home 
//寫入資料
function datapost() {
	/*Swal.fire({
		imageUrl: 'images/201511915392854716.jpg',
		imageWidth: 200,
		imageHeight: 200,
		title: '資料送出功能趕工中!',
	})*/
	var date = new Date();
	var ndate = date.toLocaleString();
	var input_name = $('#name').val();
	var input_way = $('#inputid3').val();
	var input_commodity = $('#inputid1').val();
	var input_platform = $('#inputid2').val();
	var input_money = $('#inputid4').val();
	var input_urgent = $('#inputid8').val();
	var input_shippingdate = $('#inputid5').val(); //日期格式確認
	var input_delivery = $('#inputid6').val();
	var input_deliverycode = $('#inputid7').val();
	if (input_shippingdate == ""||input_delivery == ""|| input_deliverycode == "") {
		Swal.fire({
            allowOutsideClick: false,
            imageUrl: 'images/ERROR.jpg',
			imageWidth: 200,
			imageHeight: 200,
            title: '輸入資料不完整!',
            text: '請重新確認資料輸入完整!'
        })
       return false;
	}
	$.ajax({
		beforeSend: function () {
			//將div顯示
			$('.double-wrap').fadeIn();
			$('.double').fadeIn();
		},
		type: "post",
		url: "https://script.google.com/macros/s/AKfycby7og6FAmsfNsbq81m8PsFX28P-BqSa0tqqGH_ZOYdlxo38Qf1WqZrQM5BPcHwuX5rfgw/exec",
		data: {
			"order_time": ndate,
			"order_name": input_name,
			"order_way": input_way,
			"order_commodity":input_commodity,
			"order_platform": input_platform,
			"order_money": input_money,
			"order_urgent": input_urgent,
			"order_shippingdate": input_shippingdate,
			"order_delivery": input_delivery,
			"order_deliverycode": input_deliverycode
		}, complete: function () {

			$('.double-wrap').fadeOut();
			$('.double').fadeOut();
		},
		success: function (response) {
		
			if (response == "成功") {
				Swal.fire({
					allowOutsideClick: false,
					width: 600,
					imageUrl: 'images/doge.jpg',
					imageWidth: 200,
					imageHeight: 300,
                    padding: '3em',
					title: '資料回填成功!',
					text: '貨到倉或寄回台灣時會再通知~',
					backdrop: `
					rgba(0,0,123,0.4)
					url("/images/nyan-cat.gif")
					left top
					no-repeat
				  `
				}).then((result) => {
					dataget();
				})
			}else{
				Swal.fire({
					allowOutsideClick: false,
					imageUrl: 'images/ERROR.jpg',
					imageWidth: 200,
					imageHeight: 200,
					title: '發生錯誤!',
					text:'請稍後在試，還是有問題請回報~'
				})
			}
		}
	});

}
//呼叫資料
function dataget() {
	sessionStorage.clear(); 
	$('#inputinfo2').hide();
	$('#inputinfo3').hide();
	$('#inputinfo4').hide();
	$('#inputinfo5').hide();
	$('#inputinfo6').hide();$('#inputid5').val("");
	$('#inputinfo7').hide();$('#inputid6').val("");
	$('#inputinfo8').hide();$('#inputid7').val("");
	$('#inputinfo9').hide();$('#inputid8').val("");
	$('#goback').hide();
	$('#ddinfo').text("(點選已出貨通知之商品)");
	var name = $('#name').val();
	if (name == "") {
		Swal.fire({
            allowOutsideClick: false,
            imageUrl: 'images/ERROR.jpg',
			imageWidth: 200,
			imageHeight: 200,
            title: '輸入資料不完整!',
            text: '請重新確認資料輸入完整!'
        })
       return false;
	}
	$.ajax({
		beforeSend: function () {
			//將div顯示
			$('.double-wrap').fadeIn();
			$('.double').fadeIn();
		},
		type: "get",
		url: "https://script.google.com/macros/s/AKfycby7og6FAmsfNsbq81m8PsFX28P-BqSa0tqqGH_ZOYdlxo38Qf1WqZrQM5BPcHwuX5rfgw/exec",
		data: {
			"type": "select",
			"order_name": name
		}, complete: function () {

			$('.double-wrap').fadeOut();
			$('.double').fadeOut();
		},
		success: function (response) {
			var list = response.length;
			var bt = "";
			for (i = 0; i < list; i++) {
				if (response[i].output[8] != "y"){
					doCookie(i,response[i].output);
					if (response[i].output[2] == "自己"){
						bt += '<button type="button" class="btn btn-primary" onclick="dataStorage('+i+')">'+response[i].output[4]+'</button>';
					}else{
						bt += '<button type="button" class="btn btn-primary" onclick="dataStorage('+i+')">'+response[i].output[4]+' / '+ response[i].output[2] + '</button>';
					}
				}
			}
			$('#inputinfo1').fadeIn();
			$('#gobt1').fadeOut();
			$('#goodbt').html(bt);
		}
	});
}
function dataStorage(data) {
 var Storage = sessionStorage.getItem('list'+ data);
 var ar=Storage.split(',');
 $('#ddinfo').text("(請填寫出貨通知詳細資料)");
 $('#inputinfo1').hide();
 $('#inputinfo2').fadeIn();
 $('#inputinfo3').fadeIn();
 $('#inputinfo4').fadeIn();
 $('#inputinfo5').fadeIn();
 $('#inputinfo6').fadeIn();
 $('#inputinfo7').fadeIn();
 $('#inputinfo8').fadeIn();
 $('#inputinfo9').fadeIn();
 $('#goback').fadeIn();
 $('#inputid1').val(ar[4]);
 $('#inputid2').val(ar[3]);
 $('#inputid3').val(ar[7]);
 $('#inputid4').val(ar[6]);
}
function goback() {
	
	$('#ddinfo').text("(點選已出貨通知之商品)");
	$('#inputinfo1').fadeIn();
	$('#inputinfo2').hide();
	$('#inputinfo3').hide();
	$('#inputinfo4').hide();
	$('#inputinfo5').hide();
	$('#inputinfo6').hide();$('#inputid5').val("");
	$('#inputinfo7').hide();$('#inputid6').val("");
	$('#inputinfo8').hide();$('#inputid7').val("");
	$('#inputinfo9').hide();$('#inputid8').val("");
	$('#goback').hide();
	$('#inputid1').val("");
	$('#inputid2').val("");
	$('#inputid3').val("");
	$('#inputid4').val("");
   }
function doCookie(list,info) {
    window.sessionStorage.setItem("list"+ list, info);
}