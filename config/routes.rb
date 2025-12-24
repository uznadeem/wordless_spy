Rails.application.routes.draw do
  resources :rooms do
    post :leave, on: :member
    post :timeout, on: :member
  end

  resources :games do
    post :start, on: :member
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
