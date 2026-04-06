import Economy from './pages/Economy';
import Food from './pages/Food';
import Organization from './pages/Organization';
import RecipeDetail from './pages/RecipeDetail';
import Settings from './pages/Settings';
import Shopping from './pages/Shopping';
import Login from './pages/Login';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Economy": Economy,
    "Food": Food,
    "Organization": Organization,
    "RecipeDetail": RecipeDetail,
    "Settings": Settings,
    "Shopping": Shopping,
}

export const pagesConfig = {
    mainPage: "Food",
    Pages: PAGES,
    Layout: __Layout,
};