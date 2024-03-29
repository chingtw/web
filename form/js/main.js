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
	$('#inputinfo10').hide();
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
		$('#inputinfo10').hide();
		$('#goodbt').html('');
		$('#goback').hide();
		$('#ddinfo').text("(請輸入網購登記相同名稱)");
	});
	var updatainfo = `1.新增出貨回填【特殊注意商品】與【已到倉資訊】<br>
	2.新增【FC與個人信件包裹】類別<br>
	3.倉庫收件地址點擊複製 <br>
	4.包裹登記GOOGLE表單流程更新<br>
	5.優化UI資訊效果
	`
	tippy('#updata', {
		allowHTML: true,
		hideOnClick: 'toggle',
		maxWidth: 'none',
		placement: 'bottom',
		content: updatainfo,
	});
	datagetdata();
	$("#inputid6select").change(function () {
		var val = $("#inputid6select").val();
		if (val == "其他") {
			$("#inputid6").val("");
			$('#inputid6').attr("placeholder", "請輸入宅配物流公司名稱");
			document.getElementById('inputid6').focus();

		} else if (val == "0") {
			$("#inputid6").val("");
			$('#inputid6').attr("placeholder", "請選擇日本國內宅配物流");
		} else {
			$("#inputid6").val(val);
		}

	});
	$("#inputid10select").change(function () {
		var val = $("#inputid10select").val();
		if (val == "其他") {
			$("#inputid10").val("");
			$('#inputid10').attr("placeholder", "請輸入特殊注意項目");
			document.getElementById('inputid10').focus();
		} else if (val == "0") {
			$("#inputid10").val("");
			$('#inputid10').attr("placeholder", "請選擇");
		} else {
			$("#inputid10").val(val);
		}

	});
	$("#name").keydown(function(event) {
		if(event.keyCode == 13){
			if ($("#name").val()){
				dataget();
			}
		};
	});
	$("#jpForm input").click(function () {
		copyCode(this.value);
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
	var input_urgent = $("input[name='flexRadioDefault']:checked").val();
	var input_shippingdate = $('#inputid5').val();
	var input_delivery = $('#inputid6').val();
	var input_notice = $('#inputid10').val();
	var input_deliverycode = $('#inputid7').val();
	if (input_shippingdate == "" || input_delivery == "" || input_deliverycode == "" || input_notice == "" || input_platform == "" || input_money == "") {
		Swal.fire({
			allowOutsideClick: false,
			imageUrl: 'images/ERROR.gif',
			imageWidth: 300,
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
		url: "https://script.google.com/macros/s/AKfycbzkk7pmnwTnQmB0tkGGQ2fc2CzKp2nf4oxWF837sG9PLvI0wmxS183n3z_55MOq4Ad_-w/exec",
		data: {
			"order_time": ndate,
			"order_name": input_name,
			"order_way": input_way,
			"order_commodity": input_commodity,
			"order_platform": input_platform,
			"order_money": input_money,
			"order_urgent": input_urgent,
			"order_notice" : input_notice,
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
					imageUrl: 'images/ok.gif',
					imageWidth: 300,
					imageHeight: 200,
					padding: '3em',
					title: '資料回填成功!',
					text: '貨到倉或寄回台灣時會再通知~',
					backdrop: `
					rgba(0,0,123,0.4)
					url("./images/nyan-cat.gif")
					left top
					no-repeat
				  `
				}).then((result) => {
					dataget();
				})
			} else {
				Swal.fire({
					allowOutsideClick: false,
					imageUrl: 'images/ERROR.gif',
					imageWidth: 300,
					imageHeight: 200,
					title: '發生錯誤!',
					text: '請稍後在試，還是有問題請回報~'
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
	$('#inputinfo6').hide(); $('#inputid5').val("");
	$('#inputinfo7').hide(); $("#inputid6select")[0].selectedIndex = 0; $('#inputid6').val("");
	$('#inputinfo8').hide(); $('#inputid7').val("");
	$('#inputinfo9').hide(); $("input[type='radio'][name='flexRadioDefault'][value='否']").prop("checked", true);
	$('#inputinfo10').hide();$("#inputid10select")[0].selectedIndex = 0; $('#inputid10').val("");
	$('#goback').hide();
	$('#ddinfo').text("(點選已出貨通知之商品)");
	var name = $('#name').val();
	if (name == "") {
		Swal.fire({
			allowOutsideClick: false,
			imageUrl: 'images/ERROR.gif',
			imageWidth: 300,
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
		url: "https://script.google.com/macros/s/AKfycbzkk7pmnwTnQmB0tkGGQ2fc2CzKp2nf4oxWF837sG9PLvI0wmxS183n3z_55MOq4Ad_-w/exec",
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
			if (list == 0){
				Swal.fire({
					allowOutsideClick: false,
					imageUrl: 'images/ERROR.gif',
					imageWidth: 300,
					imageHeight: 200,
					title: '綽號名稱沒包裹',
					text: '請重新確認名稱是否正確!'
				})
				return false;
			}else{
				for (i = 0; i < list; i++) {
					if (response[i].output[8] != "y") {
						doCookie(i, response[i].output);
						if (response[i].output[2] == "自己") {
							bt += '<button type="button" class="btn btn-primary" onclick="dataStorage(' + i + ')">' + response[i].output[4] + '</button><br>';
						} else if (response[i].output[2] == "") {
							bt += '<button type="button" class="btn btn-primary" onclick="dataStorage(' + i + ')">' + response[i].output[4] + ' / ' + response[i].output[7] + '</button><br>';
						}else {
							bt += '<button type="button" class="btn btn-primary" onclick="dataStorage(' + i + ')">' + response[i].output[4] + ' / ' + response[i].output[2] + '</button><br>';
						}
					}
				}
				$('#inputinfo1').fadeIn();
				$('#gobt1').fadeOut();
				$('#goodbt').html(bt);
			}
			
		}
	});
}
function datagetdata() {
	$.ajax({
		beforeSend: function () {
			//將div顯示
			$('.double-wrap').fadeIn();
			$('.double').fadeIn();
		},
		type: "get",
		url: "https://script.google.com/macros/s/AKfycbzkk7pmnwTnQmB0tkGGQ2fc2CzKp2nf4oxWF837sG9PLvI0wmxS183n3z_55MOq4Ad_-w/exec",
		data: {
			"type": "data",
			"order_name": ""
		}, complete: function () {

			$('.double-wrap').fadeOut();
			$('.double').fadeOut();
		},
		success: function (response) {
			//var list = response.length;
			//console.log(response);
			//$("#gtdata").html(response[0].output[0]+"<br>"+response[0].output[1]+"<br>"+response[0].output[2]+"<br>");
			var datahtml = "<strong>"+response[0].output[0]+"<br>"+response[0].output[1]+"<br>(非集運後總重量)<br>"+response[0].output[2]+"<br></strong>"
			tippy('#gtdata2', {
				allowHTML: true,
				hideOnClick: 'toggle',
				maxWidth: 'none',
				content: datahtml,
			});
			$("#gtdata").html("資料更新成功<br>點擊顯示資訊");
			$("#gtdata").fadeOut(3000);
		}
	});
}
function dataStorage(data) {
	var Storage = sessionStorage.getItem('list' + data);
	var ar = Storage.split(',');
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
	$('#inputinfo10').fadeIn();
	$('#inputid1').val(ar[4]);
	$('#inputid3').val(ar[7]);
	$('#goback').fadeIn();
	if (ar[2] == ""){
		
		$('#inputid2').attr("disabled",false);
		$('#inputid4').attr("disabled",false);
		$('#inputid2').attr("placeholder", "請輸入出貨平台");
		$('#inputid4').attr("placeholder", "請輸入預估價值金額");

	}else{
		$('#inputid2').val(ar[3]);
		$('#inputid4').val(ar[6]);
		$('#inputid2').attr("disabled",true);
		$('#inputid4').attr("disabled",true);
		$('#inputid2').attr("placeholder", "");
		$('#inputid4').attr("placeholder", "");
	}
}
function goback() {

	$('#ddinfo').text("(點選已出貨通知之商品)");
	$('#inputinfo1').fadeIn();
	$('#inputinfo2').hide();
	$('#inputinfo3').hide();
	$('#inputinfo4').hide();
	$('#inputinfo5').hide();
	$('#inputinfo6').hide(); $('#inputid5').val("");
	$('#inputinfo7').hide(); $("#inputid6select")[0].selectedIndex = 0; $('#inputid6').val("");
	$('#inputinfo8').hide(); $('#inputid7').val("");
	$('#inputinfo9').hide(); $("input[type='radio'][name='flexRadioDefault'][value='否']").prop("checked", true);
	$('#inputinfo10').hide();$("#inputid10select")[0].selectedIndex = 0; $('#inputid10').val("");
	$('#goback').hide();
	$('#inputid1').val("");
	$('#inputid2').val("");
	$('#inputid3').val("");
	$('#inputid4').val("");
}
function doCookie(list, info) {
	window.sessionStorage.setItem("list" + list, info);
}


function copyCode(Code,t) {
	//console.log(Code);
	let input = `<input type="text" id="temp" value="${Code}">`;
	$("body").append(input); //放入document
	$("#temp").select(); //選中輸入框的文字，目前只有input和textarea支援,注意要複製的標籤不能隱藏(display: none;)
	document.execCommand("Copy"); //執行document的複製
	$("#temp").remove(); //用完就扔
	Swal.fire({
		allowOutsideClick: false,
		icon: 'success',
		title: '已複製',
		confirmButtonText: '確定',
		showConfirmButton: false,
		timer: 1000
	})
}
