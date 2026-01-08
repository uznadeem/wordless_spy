Rails.application.routes.draw do
  resources :rooms do
   # patch :restart_game, on: :member
    post :leave, on: :member
    patch :timeout, on: :member
  end

  resources :games do
    post :start, on: :member
    patch :vote_modal, on: :member
  end

  resources :rounds do
    patch :vote_out,on: :member
  end

  devise_for :users

  resources :users do
    get :dashboard, on: :collection
  end

  authenticated :user do
    root to: "users#dashboard", as: :authenticated_user_root
  end

  root "pages#home"

  mount ActionCable.server => "/cable"
end
