-- Rota — conserta a gravação do activity_log, que rejeitava toda
-- escrita partida de usuário real.
--
-- O comentário na migration ...0003 dizia, sobre o activity_log:
--   "Sem INSERT/UPDATE/DELETE — só triggers (que rodam com privilégios
--    da tabela)."
--
-- A premissa está errada. Função de trigger em plpgsql roda como quem
-- invoca (SECURITY INVOKER é o default), não com privilégios da tabela.
-- Como o activity_log tem RLS ligada e nenhuma policy de INSERT, todo
-- log disparado por usuário comum era rejeitado — e, por ser dentro de
-- trigger, derrubava a transação inteira junto.
--
-- Verificado em cluster local, como membro ativo:
--   inserir comentário ....... ERROR: new row violates RLS ... activity_log
--   criar processo ........... ERROR: new row violates RLS ... activity_log
--   mudar status ............. ERROR: new row violates RLS ... activity_log
--
-- Ou seja: comentar, cadastrar processo e mudar status estavam
-- quebrados para todo mundo. Passou despercebido porque o seed roda
-- como superusuário, que ignora RLS, e o app ainda não tinha sido
-- exercido com uma sessão real.
--
-- A correção torna as funções de log SECURITY DEFINER, com search_path
-- fixo. Elas passam a gravar como donas da tabela, que é o que o
-- comentário original já supunha — e o activity_log continua sem
-- policy de INSERT, de modo que ninguém consegue forjar entrada
-- escrevendo direto: só os triggers escrevem. A intenção do desenho
-- original fica, enfim, verdadeira.

alter function public.log_process_activity()    security definer set search_path = public;
alter function public.log_assignment_activity() security definer set search_path = public;
alter function public.log_comment_activity()    security definer set search_path = public;
