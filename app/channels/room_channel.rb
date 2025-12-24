class RoomChannel < ApplicationCable::Channel
  def subscribed
    room_id = params[:room_id]
    stream_from "room_#{room_id}_channel"
  end

  def unsubscribed
  end
end
