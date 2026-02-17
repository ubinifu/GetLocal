import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { clearCredentials } from './store/authSlice';
import { setAuthFailureHandler } from './services/api';
import App from './App';
import './styles/index.css';

// When token refresh fails, clear Redux auth state so the UI redirects to login
setAuthFailureHandler(() => {
  store.dispatch(clearCredentials());
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
