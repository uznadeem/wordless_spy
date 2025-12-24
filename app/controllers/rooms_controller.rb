class RoomsController < ApplicationController
  before_action :authenticate_user!, only: %i[ index show new edit create destroy ]
  before_action :set_room, only: %i[ show edit update destroy leave timeout ]
  before_action :set_game, only: %i[ show leave update timeout]
  before_action :verify_owner, only: %i[ edit update destroy ]

  def index
    @rooms = Room.all
  end

  def show
    redirect_to root_path, alert: @game.errors.full_messages.to_sentence unless @game.join_game(current_user.id)
  end

  def new
    @room = Room.new
  end

  def edit
  end

  def create
    @room = Room.new(room_params)

    if @room.save!
      redirect_to @room, notice: "Room was successfully created."
    else
      render :new, status: :unprocessable_entity
    end
  end

  def timeout
    @game.spy_guess_word("No word selected")
  end

  def update
    if request.content_type == "application/json"
      if params[:restart_game]
        previous_game = @room.games.where.not(id: @room.current_game_id).order(id: :desc).limit(1).take
        @game.restart_game(previous_game)
      end
     else
       if @room.update(room_params)
         redirect_to @room, notice: "Room was successfully updated."
       else
        render :edit, status: :unprocessable_entity
      end
    end
  end


  def destroy
    @room.destroy!

    flash[:notice] = "Post Deleted Successfully"

    redirect_to dashboard_users_path, notice: "Room was successfully destroyed."
  end

  def leave
    @game.leave_game(current_user.id)
    redirect_to root_path
  end

  private

  def set_room
    @room = Room.find_by(id: params[:id])
    redirect_to dashboard_users_path, error: "Room Not found" if @room == nil
  end

  def set_game
    @game = @room.current_game
  end

  def room_params
    params.expect(room: [ :name, :user_id ])
  end

  def verify_owner
    redirect_to dashboard_users_path, error: "Not authorized." if @room.user_id != current_user.id
  end
end
