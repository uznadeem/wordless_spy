class RoomChannel < ApplicationCable::Channel
  def subscribed
    room_id = params[:room_id]
    stream_from "room_#{room_id}_channel"
  end

  def unsubscribed
  end

  def spy_modal_timeout(data)
    room_id = params[:room_id]
    room = Room.find(room_id)
    game = room.current_game
    game.spy_guess_word("No word selected")
  end
end
