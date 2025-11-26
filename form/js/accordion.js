$(document).ready(function () {
  $('.accordion-button').click(function () {
    var content = $(this).closest('.accordion-item').find('.accordion-collapse');
    var allContents = $('.accordion-collapse');
    var allButtons = $('.accordion-button');

    if (content.hasClass('show')) {
      content.removeClass('show');
      $(this).attr('aria-expanded', 'false');
    } else {
      allContents.removeClass('show');
      allButtons.attr('aria-expanded', 'false');
      content.addClass('show');
      $(this).attr('aria-expanded', 'true');
    }
  });
});
