$(document).ready(() => {
    $('.edit-button').each(function () {
        var $this = $(this)
        $this.on("click", function () {

            var datetime = $(this).data('datetime')
            var unit = $(this).data('unit')
            var round = $(this).data('round')
            var slot = $(this).data('slot')
            var fort = $(this).data('fort')

            $('.edit.modal #modal-title').text('Edit Round ' + round + ' (Unit ' + slot + ')')
            $('.edit.modal #fort').val(fort)
            $('.edit.modal #datetime').val(datetime)
            $('.edit.modal #unit').val(unit.unit_id)
            $('.edit.modal #speed').val(unit.unit_speed)
            $('.edit.modal #health').val(unit.unit_health)
            $('.edit.modal #artifact').val(unit.unit_artifact)
            $('.edit.modal #immunity-yes').prop('checked', unit.immunity ? unit.immunity == 1 : false)
            $('.edit.modal #immunity-no').prop('checked', unit.immunity ? unit.immunity == 0 : true)
            $('.edit.modal input[name="unit_round"]').val(round)
            $('.edit.modal input[name="unit_slot"]').val(slot)

            $('.edit.modal').show()
        })
    })

    $('.view-button').on('click', function () {

        $('.view-comments.modal #comments').empty()

        var round = $(this).data('round')
        var slot = $(this).data('slot')
        var unit = $(this).data('unit')
        var unit_id = unit.fortress_info_unit_id

        $('.view-comments .info').text('(Round ' + round + ' Unit ' + slot + ')')

        $.ajax({
            url: '/get-comments?unit=' + unit_id, success: function (result) {
                for (var i = 0; i < result.length; i++) {
                    $('.view-comments.modal #comments').append('<div class="comment"><h3>' + result[i].author + '</h3><p>' + result[i].comment + '</p><h4>' + result[i].creation_datetime + '</h4></div>')
                }
            }
        })

        $('.view-comments.modal').show()
    })

    $('.add-button').on('click', function () {

        var round = $(this).data('round')
        var slot = $(this).data('slot')
        var unit = $(this).data('unit')
        var unit_id = unit.fortress_info_unit_id

        $('.new-comment input[name="unit_id"]').val(unit_id)
        
        $('.new-comment .info').text('(Round ' + round + ' Unit ' + slot + ')')

        if (unit_id) $('.new-comment.modal').show();
    })

    $('.create-new').on('click', function () {
        $('.new.modal').show();
    })

    $('.update-guild-name').on('click', function () {
        $('.guildname.modal').show();
    })

    $('.add-fort').on('click', function () {
        $('.fort.modal').show();
    })

    $('.close').on('click', function () {
        $(this).parent().hide();
    })
})