--
-- PostgreSQL database dump
--

\restrict kvFhVMtZIRWquWmHxWNOV7ZnRjNfVR6fAq4HNHGcI3Hb7HiL6LylWLt7Z3F4std

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    is_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    user_id integer
);


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tasks (id, title, description, is_completed, created_at, user_id) FROM stdin;
3	Test is_completed	test	t	2026-08-03 06:33:43.918022	\N
4	Task riêng của A	\N	f	2026-08-04 07:46:45.384899	1
8	next js	Đây là task tụ học\n	f	2026-08-10 06:41:51.013427	6
7	Nest jss	Đây là task tự hoc	f	2026-08-10 06:36:07.974794	6
9	Test cache	\N	f	2026-08-10 07:26:51.410755	3
10	Test invalidation	\N	f	2026-08-10 08:09:51.717908	3
14	test socket	123455	f	2026-08-10 10:04:38.849352	6
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password, created_at) FROM stdin;
1	test@example.com	$2b$10$zOEfcrq3lWDUeSzAcl6zbu4IvtT.1o.7muJtvT/kCncdbl6YzQ2Ri	2026-08-04 06:39:36.542193
2	userB@example.com	$2b$10$/4Oo79tnflyGMVjYN47G2e6/.wBBZPi4/JPPi3uOb5G0y.smvzQQ2	2026-08-04 07:45:37.063623
3	nestuser@example.com	$2b$10$N47SqKIinXVLMmVg5b1fOuKGvHOG5vgfGfZAvuKHBFa93Kye/qTO6	2026-08-06 04:30:17.404948
4	nestuserB@example.com	$2b$10$lD8G47QboyGoyNkMFA9RF.JRV6pk6jWuYfykYgCgJiYpXGEQMUL86	2026-08-07 04:31:33.370536
5	debugtest@example.com	$2b$10$rsyq5VBcxy/W7B4zoFDw9.HI5dLOMxJQxyflpYs0BjRCHHNyMENvO	2026-08-07 09:38:14.708532
6	kienpt@gmail.com	$2b$10$SdkmXt6FFxazYC7oBsIC0.jZVmcVIufLtyOivfQf/P1Hj80hxoKHe	2026-08-10 04:21:18.805566
\.


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 14, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 6, true);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict kvFhVMtZIRWquWmHxWNOV7ZnRjNfVR6fAq4HNHGcI3Hb7HiL6LylWLt7Z3F4std

